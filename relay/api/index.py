from fastapi import FastAPI, Request, HTTPException
import httpx
import os

app = FastAPI()

# Bybit Base URL
_is_testnet = os.getenv("BYBIT_TESTNET", "false").lower() == "true"
BYBIT_URL = os.getenv(
    "BYBIT_URL",
    "https://api-testnet.bybit.com" if _is_testnet else "https://api.bybit.com",
)

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(path: str, request: Request):
    async with httpx.AsyncClient() as client:
        # Construct target URL
        url = f"{BYBIT_URL}/{path}"
        
        # Get original headers and add common relay headers
        headers = dict(request.headers)
        headers.pop("host", None)
        
        # Get body/params
        params = dict(request.query_params)
        content = await request.body()
        
        try:
            resp = await client.request(
                method=request.method,
                url=url,
                params=params,
                content=content,
                headers=headers,
                timeout=30.0
            )
            return resp.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
