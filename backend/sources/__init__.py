"""
数据源基类与注册
"""

from abc import ABC, abstractmethod


class BaseSource(ABC):
    """热搜数据源基类"""

    name: str = ""
    icon: str = ""

    @abstractmethod
    async def fetch(self) -> list[dict]:
        """
        获取热搜数据，返回格式：
        [
            {
                "title": "热搜标题",
                "url": "链接",
                "hot_value": "热度值",
                "rank": 1,
                "category": "分类",
            }
        ]
        """
        pass
