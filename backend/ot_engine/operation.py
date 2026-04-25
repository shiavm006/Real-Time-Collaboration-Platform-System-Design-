from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

class OperationType(Enum):
    INSERT = "insert"
    DELETE = "delete"

# Abstract base class — Abstraction + OOP
class Operation(ABC):
    def __init__(self, position: int, revision: int, user_id: str):
        self.position = position
        self.revision = revision
        self.user_id = user_id

    @abstractmethod
    def apply(self, content: str) -> str:
        pass

    @abstractmethod
    def to_dict(self) -> dict:
        pass

    @abstractmethod
    def get_type(self) -> OperationType:
        pass


# Concrete class — Inheritance + Polymorphism
class InsertOperation(Operation):
    def __init__(self, position: int, char: str, revision: int, user_id: str):
        super().__init__(position, revision, user_id)
        self.char = char

    def apply(self, content: str) -> str:
        return content[:self.position] + self.char + content[self.position:]

    def get_type(self) -> OperationType:
        return OperationType.INSERT

    def to_dict(self) -> dict:
        return {
            "type": self.get_type().value,
            "position": self.position,
            "char": self.char,
            "revision": self.revision,
            "user_id": self.user_id
        }


# Concrete class — Inheritance + Polymorphism
class DeleteOperation(Operation):
    def __init__(self, position: int, revision: int, user_id: str):
        super().__init__(position, revision, user_id)

    def apply(self, content: str) -> str:
        if self.position >= len(content):
            return content
        return content[:self.position] + content[self.position + 1:]

    def get_type(self) -> OperationType:
        return OperationType.DELETE

    def to_dict(self) -> dict:
        return {
            "type": self.get_type().value,
            "position": self.position,
            "revision": self.revision,
            "user_id": self.user_id
        }


# Factory Pattern — creates operations without exposing class details
class OperationFactory:
    """
    FACTORY METHOD PATTERN
    ----------------------
    The OperationFactory abstracts the creation logic of different Operational 
    Transformation types (Insert, Delete). This elegantly allows the engine 
    to dynamically generate subclasses from incoming JSON payloads without 
    tying high-level modules to concrete struct implementations.
    """
    @staticmethod
    def create(data: dict) -> Operation:
        op_type = data.get("type")
        position = data["position"]
        revision = data["revision"]
        user_id = data["user_id"]

        if op_type == OperationType.INSERT.value:
            return InsertOperation(position, data["char"], revision, user_id)
        elif op_type == OperationType.DELETE.value:
            return DeleteOperation(position, revision, user_id)
        else:
            raise ValueError(f"Unknown operation type: {op_type}")