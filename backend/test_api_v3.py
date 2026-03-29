import requests
import json

def test_api():
    url = "http://127.0.0.1:8000/national/kpis"
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # Print summary keys
            print("Summary Keys:", data.get('summary', {}).keys())
            # Print some values from summary
            summary = data.get('summary', {})
            for k, v in summary.items():
                print(f"{k}: {v}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_api()
