import requests

endpoints = [
    "/national/kpis",
    "/national/evolution/primer_curso",
    "/national/evolution/primer_curso_sector",
    "/national/discipline_stats",
    "/national/field_trend",
    "/national/discipline_table",
    "/national/ies_table"
]

base_url = "http://127.0.0.1:8000"

def test_all():
    for ep in endpoints:
        url = base_url + ep
        try:
            response = requests.get(url)
            print(f"{ep}: {response.status_code}")
            if response.status_code != 200:
                print(f"  Error: {response.text}")
        except Exception as e:
            print(f"{ep}: Exception: {e}")

if __name__ == "__main__":
    test_all()
