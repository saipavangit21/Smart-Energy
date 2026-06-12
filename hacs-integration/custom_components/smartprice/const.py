DOMAIN = "smartprice"
API_BASE = "https://smartprice.be/api"
DEFAULT_SCAN_INTERVAL = 15  # minutes

PRICE_LEVELS = {
    "VERY_LOW":   (-999,  30),
    "LOW":        (30,    80),
    "NORMAL":     (80,   130),
    "HIGH":       (130,  200),
    "VERY_HIGH":  (200,  999),
}
