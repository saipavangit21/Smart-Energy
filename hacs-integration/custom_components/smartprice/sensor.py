"""SmartPrice Belgium sensors — EPEX Spot live prices."""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

import aiohttp
from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import (
    CoordinatorEntity,
    DataUpdateCoordinator,
    UpdateFailed,
)

from .const import API_BASE, DEFAULT_SCAN_INTERVAL, DOMAIN, PRICE_LEVELS

_LOGGER = logging.getLogger(__name__)


def _price_level(mwh: float | None) -> str:
    if mwh is None:
        return "UNKNOWN"
    for label, (low, high) in PRICE_LEVELS.items():
        if low <= mwh < high:
            return label
    return "VERY_HIGH"


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    interval = entry.options.get(
        "scan_interval", entry.data.get("scan_interval", DEFAULT_SCAN_INTERVAL)
    )
    session = async_get_clientsession(hass)
    coordinator = SmartPriceCoordinator(hass, session, interval)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = coordinator

    async_add_entities(
        [
            SmartPriceCurrentMwhSensor(coordinator, entry),
            SmartPriceCurrentKwhSensor(coordinator, entry),
            SmartPriceLevelSensor(coordinator, entry),
            SmartPriceCheapestHourSensor(coordinator, entry),
            SmartPriceCheapestPriceSensor(coordinator, entry),
            SmartPriceGasSensor(coordinator, entry),
        ],
        update_before_add=True,
    )


class SmartPriceCoordinator(DataUpdateCoordinator):
    """Fetches all SmartPrice data in one coordinator to minimise API calls."""

    def __init__(self, hass: HomeAssistant, session: aiohttp.ClientSession, interval: int):
        super().__init__(
            hass,
            _LOGGER,
            name="SmartPrice Belgium",
            update_interval=timedelta(minutes=interval),
        )
        self._session = session

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            async with self._session.get(
                f"{API_BASE}/current", timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                current = await resp.json()

            async with self._session.get(
                f"{API_BASE}/cheapest?hours=5", timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                cheapest = await resp.json()

            gas = {}
            try:
                async with self._session.get(
                    f"{API_BASE}/gas/current", timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    gas = await resp.json()
            except Exception:
                pass

            return {"current": current, "cheapest": cheapest, "gas": gas}
        except aiohttp.ClientError as err:
            raise UpdateFailed(f"SmartPrice API error: {err}") from err


class SmartPriceBaseSensor(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator: SmartPriceCoordinator, entry: ConfigEntry):
        super().__init__(coordinator)
        self._entry = entry

    @property
    def device_info(self):
        return {
            "identifiers": {(DOMAIN, self._entry.entry_id)},
            "name": "SmartPrice Belgium",
            "manufacturer": "SmartPrice.be",
            "model": "EPEX Spot Belgium",
            "configuration_url": "https://smartprice.be",
        }


class SmartPriceCurrentMwhSensor(SmartPriceBaseSensor):
    """Current EPEX Spot price in €/MWh."""

    _attr_name = "Current Price (€/MWh)"
    _attr_icon = "mdi:lightning-bolt"
    _attr_native_unit_of_measurement = "EUR/MWh"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_current_mwh"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        return data.get("current", {}).get("price_eur_mwh")

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        current = data.get("current", {})
        mwh = current.get("price_eur_mwh")
        return {
            "price_level": _price_level(mwh),
            "is_negative": mwh is not None and mwh < 0,
            "unit": "EUR/MWh",
            "source": "EPEX Spot Belgium via SmartPrice.be",
        }


class SmartPriceCurrentKwhSensor(SmartPriceBaseSensor):
    """Current EPEX price in c€/kWh (consumer-friendly unit)."""

    _attr_name = "Current Price (c€/kWh)"
    _attr_icon = "mdi:lightning-bolt-circle"
    _attr_native_unit_of_measurement = "EUR/kWh"
    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 4

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_current_kwh"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        mwh = data.get("current", {}).get("price_eur_mwh")
        if mwh is None:
            return None
        return round(mwh / 1000, 5)

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        mwh = data.get("current", {}).get("price_eur_mwh")
        return {
            "price_eur_mwh": mwh,
            "price_level": _price_level(mwh),
        }


class SmartPriceLevelSensor(SmartPriceBaseSensor):
    """Price level: VERY_LOW / LOW / NORMAL / HIGH / VERY_HIGH.
    Use this in automations to trigger appliances at LOW/VERY_LOW."""

    _attr_name = "Price Level"
    _attr_icon = "mdi:gauge"

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_price_level"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        mwh = data.get("current", {}).get("price_eur_mwh")
        return _price_level(mwh)

    @property
    def extra_state_attributes(self):
        return {
            "thresholds_eur_mwh": {
                "VERY_LOW":  "< 30",
                "LOW":       "30 – 80",
                "NORMAL":    "80 – 130",
                "HIGH":      "130 – 200",
                "VERY_HIGH": "> 200",
            },
            "automation_tip": "Trigger EV charging / washing machine when price_level == 'LOW' or 'VERY_LOW'",
        }


class SmartPriceCheapestHourSensor(SmartPriceBaseSensor):
    """Time of the next cheapest hour today (HH:MM format for automations)."""

    _attr_name = "Cheapest Hour Today"
    _attr_icon = "mdi:clock-check-outline"

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_cheapest_hour"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        hours = data.get("cheapest", {}).get("cheapest", [])
        if not hours:
            return None
        best = hours[0]
        h = best.get("hour")
        if h is None:
            return None
        return f"{int(h):02d}:00"

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        hours = data.get("cheapest", {}).get("cheapest", [])
        top5 = []
        for h in hours[:5]:
            hour = h.get("hour")
            price = h.get("price_eur_mwh")
            top5.append({
                "time": f"{int(hour):02d}:00" if hour is not None else None,
                "price_eur_mwh": price,
                "day": h.get("day", "today"),
            })
        return {"top_5_cheap_hours": top5}


class SmartPriceCheapestPriceSensor(SmartPriceBaseSensor):
    """Price at the next cheapest upcoming hour (€/MWh)."""

    _attr_name = "Cheapest Price Today"
    _attr_icon = "mdi:tag-check-outline"
    _attr_native_unit_of_measurement = "EUR/MWh"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_cheapest_price"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        hours = data.get("cheapest", {}).get("cheapest", [])
        if not hours:
            return None
        return hours[0].get("price_eur_mwh")

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        current_mwh = data.get("current", {}).get("price_eur_mwh")
        hours = data.get("cheapest", {}).get("cheapest", [])
        cheapest_mwh = hours[0].get("price_eur_mwh") if hours else None
        saving = None
        if current_mwh is not None and cheapest_mwh is not None:
            saving = round(current_mwh - cheapest_mwh, 1)
        return {
            "saving_vs_now_eur_mwh": saving,
            "price_level": _price_level(cheapest_mwh),
        }


class SmartPriceGasSensor(SmartPriceBaseSensor):
    """Live TTF gas price (€/MWh)."""

    _attr_name = "Gas Price TTF"
    _attr_icon = "mdi:fire"
    _attr_native_unit_of_measurement = "EUR/MWh"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    @property
    def unique_id(self):
        return f"{self._entry.entry_id}_gas_price"

    @property
    def native_value(self):
        data = self.coordinator.data or {}
        gas = data.get("gas", {})
        return gas.get("ttf", {}).get("price") or gas.get("price_eur_mwh")

    @property
    def extra_state_attributes(self):
        data = self.coordinator.data or {}
        gas = data.get("gas", {})
        return {
            "price_cent_per_kwh": gas.get("ttf_cEkWh"),
            "source": "TTF Natural Gas via SmartPrice.be",
        }
