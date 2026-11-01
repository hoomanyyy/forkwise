"""FastAPI backend. Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
All routes start with /api, so the React app can call them through the Vite proxy."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, Session, SQLModel, create_engine, select

engine = create_engine("sqlite:///app.db", connect_args={"check_same_thread": False})


class Item(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    done: bool = False


@asynccontextmanager
async def lifespan(app):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/items")
def list_items():
    with Session(engine) as session:
        return session.exec(select(Item)).all()


@app.post("/api/items")
def add_item(item: Item):
    with Session(engine) as session:
        session.add(item)
        session.commit()
        session.refresh(item)
        return item


@app.delete("/api/items/{item_id}")
def delete_item(item_id: int):
    with Session(engine) as session:
        item = session.get(Item, item_id)
        if item is None:
            raise HTTPException(404, "Not found")
        session.delete(item)
        session.commit()
        return {"ok": True}
