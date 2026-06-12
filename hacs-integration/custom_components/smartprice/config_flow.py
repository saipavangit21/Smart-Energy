"""Config flow for SmartPrice Belgium."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback

from .const import DOMAIN, DEFAULT_SCAN_INTERVAL


class SmartPriceConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle the initial setup via UI."""

    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(
                title="SmartPrice Belgium",
                data=user_input,
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Optional(
                        "scan_interval", default=DEFAULT_SCAN_INTERVAL
                    ): vol.All(vol.Coerce(int), vol.Range(min=5, max=60)),
                }
            ),
            description_placeholders={
                "api_url": "https://smartprice.be/api",
                "docs_url": "https://smartprice.be/api-docs",
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return SmartPriceOptionsFlow(config_entry)


class SmartPriceOptionsFlow(config_entries.OptionsFlow):
    """Allow changing scan interval after setup."""

    def __init__(self, config_entry):
        self._config_entry = config_entry

    async def async_step_init(self, user_input=None):
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        current_interval = self._config_entry.options.get(
            "scan_interval",
            self._config_entry.data.get("scan_interval", DEFAULT_SCAN_INTERVAL),
        )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Optional("scan_interval", default=current_interval): vol.All(
                        vol.Coerce(int), vol.Range(min=5, max=60)
                    ),
                }
            ),
        )
