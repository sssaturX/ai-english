from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any


@dataclass
class _CacheItem:
    value: Any
    expires_at: float


class TTLCache:
    def __init__(self, *, ttl_s: float = 300.0, max_items: int = 256):
        self.ttl_s = ttl_s
        self.max_items = max_items
        self._items: dict[str, _CacheItem] = {}

    def get(self, key: str) -> Any | None:
        item = self._items.get(key)
        if not item:
            return None
        if item.expires_at < time.time():
            self._items.pop(key, None)
            return None
        return item.value

    def set(self, key: str, value: Any) -> None:
        # Very small MVP cache: if we exceed size, drop an arbitrary old-ish item.
        if len(self._items) >= self.max_items:
            self._items.pop(next(iter(self._items)), None)
        self._items[key] = _CacheItem(value=value, expires_at=time.time() + self.ttl_s)

