from fastapi.testclient import TestClient
from main import app
import sys

def debug_client():
    client = TestClient(app)
    print("Testing /national/ies_list with TestClient...")
    
    try:
        response = client.get("/national/ies_list")
        if response.status_code != 200:
            print(f"Status: {response.status_code}")
            print(f"Error Detail: {response.text}") # The traceback might be in response.text due to HTTPException(detail=str(e))
        else:
            data = response.json()
            print(f"Success. Items: {len(data)}")
            
    except Exception as e:
        print(f"Exception during request: {e}")

if __name__ == "__main__":
    debug_client()
