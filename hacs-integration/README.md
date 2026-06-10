# SmartPrice Belgium — Home Assistant Integration

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub release](https://img.shields.io/github/release/saipavangit21/smartprice-ha.svg)](https://github.com/saipavangit21/smartprice-ha/releases)

Live **EPEX Spot Belgium** electricity prices in Home Assistant. Know exactly when to charge your EV, run the washing machine, or trigger any high-consumption appliance — updated every 15 minutes, **completely free**, no API key required.

---

## What you get

| Sensor | Description | Use case |
|--------|-------------|----------|
| `sensor.smartprice_current_price_eur_mwh` | Live EPEX price in €/MWh | Dashboard display |
| `sensor.smartprice_current_price_c_kwh` | Same price in €/kWh | Energy dashboard |
| `sensor.smartprice_price_level` | VERY_LOW / LOW / NORMAL / HIGH / VERY_HIGH | Automation trigger |
| `sensor.smartprice_cheapest_hour_today` | Time of cheapest upcoming hour (HH:MM) | Schedule EV charging |
| `sensor.smartprice_cheapest_price_today` | Price at cheapest upcoming hour | Dashboard |
| `sensor.smartprice_gas_price_ttf` | Live TTF gas price (€/MWh) | Gas contract tracking |

---

## Installation via HACS

1. Open HACS in Home Assistant
2. Go to **Integrations** → click the three dots (⋮) → **Custom repositories**
3. Add `https://github.com/saipavangit21/smartprice-ha` as an **Integration**
4. Search for **SmartPrice** and click Install
5. Restart Home Assistant
6. Go to **Settings → Devices & Services → Add Integration** → search **SmartPrice Belgium**

---

## Automation examples

### Charge EV when price is LOW
```yaml
automation:
  alias: "Start EV charging when electricity is cheap"
  trigger:
    - platform: state
      entity_id: sensor.smartprice_price_level
      to: "LOW"
  condition:
    - condition: state
      entity_id: sensor.smartprice_price_level
      state: "LOW"
  action:
    - service: switch.turn_on
      target:
        entity_id: switch.ev_charger   # replace with your charger entity
```

### Notify when negative prices (free electricity)
```yaml
automation:
  alias: "Alert — electricity price is negative"
  trigger:
    - platform: numeric_state
      entity_id: sensor.smartprice_current_price_eur_mwh
      below: 0
  action:
    - service: notify.mobile_app
      data:
        title: "⚡ Free electricity!"
        message: >
          EPEX price is {{ states('sensor.smartprice_current_price_eur_mwh') }} €/MWh.
          Turn on high-consumption appliances now.
```

### Run washing machine at cheapest hour
```yaml
automation:
  alias: "Washing machine at cheapest hour"
  trigger:
    - platform: template
      value_template: >
        {{ now().strftime('%H:%M') == states('sensor.smartprice_cheapest_hour_today') }}
  action:
    - service: switch.turn_on
      target:
        entity_id: switch.washing_machine_smart_plug
```

---

## Dashboard card (Lovelace)

```yaml
type: entities
title: SmartPrice Belgium
entities:
  - entity: sensor.smartprice_current_price_eur_mwh
    name: Current price
  - entity: sensor.smartprice_price_level
    name: Price level
  - entity: sensor.smartprice_cheapest_hour_today
    name: Cheapest hour today
  - entity: sensor.smartprice_cheapest_price_today
    name: Cheapest price today
  - entity: sensor.smartprice_gas_price_ttf
    name: Gas price (TTF)
```

---

## Data source

All data comes from **[SmartPrice.be](https://smartprice.be)** — a free Belgian energy intelligence platform.

- Electricity: EPEX Spot Belgium day-ahead market (via Fraunhofer ISE Energy-Charts)
- Gas: TTF Natural Gas front-month
- Updated: every 15 minutes on the SmartPrice server
- No account or API key required

---

## Price level thresholds

| Level | €/MWh | What to do |
|-------|--------|------------|
| VERY_LOW | < 30 | Run everything — prices at historic lows |
| LOW | 30–80 | Good time for EV charging, washing machine |
| NORMAL | 80–130 | Standard usage |
| HIGH | 130–200 | Avoid heavy consumption if possible |
| VERY_HIGH | > 200 | Shift usage if you can |

---

## Support

- **SmartPrice.be**: [smartprice.be](https://smartprice.be)
- **API docs**: [smartprice.be/api-docs](https://smartprice.be/api-docs)
- **Issues**: [GitHub Issues](https://github.com/saipavangit21/smartprice-ha/issues)
- **Email**: info@smartprice.be
