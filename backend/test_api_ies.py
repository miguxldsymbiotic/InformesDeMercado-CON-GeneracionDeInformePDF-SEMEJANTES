import requests
import json

def test_api():
    base_url = "http://localhost:8000/national/ies_list"
    
    print("Test 1: GET without params")
    try:
        response = requests.get(base_url)
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Items count: {len(data)}")
        if len(data) > 0:
            print("First item sample:", json.dumps(data[0], indent=2))
        else:
            print("Data is empty array []")
            
    except Exception as e:
        print(f"Request failed: {e}")

    print("\nTest 2: GET with empty params (simulating frontend)")
    try:
        # Simulate typical frontend empty params (though usually cleaned)
        response = requests.get(base_url, params={'sector': [], 'modalidad': []})
        # Note: requests handles list params by repeating keys sector=...&sector=...
        # If empty list, key is omitted.
        print(f"Status Code: {response.status_code}")
        print(f"Items count: {len(response.json())}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_api()
