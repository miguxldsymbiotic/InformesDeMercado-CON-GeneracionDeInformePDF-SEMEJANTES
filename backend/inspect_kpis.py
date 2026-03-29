import requests
import json

url = "http://127.0.0.1:8000/national/kpis"
response = requests.get(url)
print(json.dumps(response.json(), indent=2))
