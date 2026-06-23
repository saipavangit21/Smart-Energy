DOMAIN = "smartprice"
API_BASE = "https://smartprice.be/api"
DEFAULT_SCAN_INTERVAL = 15  # minutes
INTEGRATION_VERSION = "1.0.2"
CLIENT_HEADERS = {
    "X-SmartPrice-Client": "homeassistant",
    "User-Agent": f"SmartPrice-HA/{INTEGRATION_VERSION}",
}

PRICE_LEVELS = {
    "VERY_LOW":   (-999,  30),
    "LOW":        (30,    80),
    "NORMAL":     (80,   130),
    "HIGH":       (130,  200),
    "VERY_HIGH":  (200,  999),
}
