CONVERSION_RATES = {
    "USD": 10.0,
    "EUR": 11.0,
    "MAD": 1.0,
    "GBP": 13.0,
    "CAD": 7.5,
    "AUD": 6.8,
}

async def convert_to_mad(amount: float, currency: str = "USD") -> float:
    rate = CONVERSION_RATES.get(currency.upper(), 10.0)
    return amount * rate

def format_mad(amount_mad: float) -> str:
    return f"{amount_mad:,.0f} MAD"
