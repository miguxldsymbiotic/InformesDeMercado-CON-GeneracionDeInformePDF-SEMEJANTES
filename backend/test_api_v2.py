import requests
import json

def test_kpis():
    url = "http://127.0.0.1:8000/national/kpis"
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("KPI Summary Data:")
            print(json.dumps(data.get("summary", {}), indent=2))
            
            # Check if values are zero or null
            summary = data.get("summary", {})
            if summary.get("num_ies") == 0:
                print("\nWARNING: No IES found. This indicates the database might not be yielding data.")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_kpis()
