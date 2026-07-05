"""
dataset_service.py — Load & extract dataset metadata

Chỉ gửi metadata (columns, dtypes, stats) cho LLM.
KHÔNG gửi toàn bộ CSV để tránh exceed token limit.
"""

import pandas as pd
from pathlib import Path
from typing import Optional
from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()


class DatasetMetadata:
    """Chứa metadata của dataset để inject vào prompt."""

    def __init__(
        self,
        name: str,
        row_count: int,
        column_count: int,
        columns: list[dict],
        sample_values: dict,
    ):
        self.name = name
        self.row_count = row_count
        self.column_count = column_count
        self.columns = columns          # [{name, dtype, min, max, null_count}, ...]
        self.sample_values = sample_values  # {col_name: [val1, val2, val3]}

    def to_prompt_text(self) -> str:
        """Chuyển metadata thành text để inject vào system prompt."""
        lines = [
            f"DATASET: {self.name}",
            f"Total rows: {self.row_count:,}",
            f"Total columns: {self.column_count}",
            "",
            "COLUMNS:",
        ]

        for col in self.columns:
            col_line = f"  - {col['name']} ({col['dtype']})"
            if col.get("min") is not None:
                col_line += f" | min={col['min']}, max={col['max']}"
            if col.get("null_count", 0) > 0:
                col_line += f" | nulls={col['null_count']}"
            lines.append(col_line)

            # Thêm sample values cho cột categorical
            if col['name'] in self.sample_values:
                samples = self.sample_values[col['name']]
                lines.append(f"    sample values: {samples}")

        return "\n".join(lines)


class DatasetService:
    """Service load và cache dataset metadata."""

    def __init__(self):
        self._cache: dict[str, DatasetMetadata] = {}
        self._df_cache: dict[str, pd.DataFrame] = {}

    def _load_df(self, dataset_id: str) -> Optional[pd.DataFrame]:
        """Load DataFrame từ file CSV."""
        if dataset_id in self._df_cache:
            return self._df_cache[dataset_id]

        # Hiện tại chỉ có 1 dataset mặc định
        dataset_path = Path(settings.dataset_path)

        if not dataset_path.exists():
            logger.error(f"Dataset file not found: {dataset_path}")
            return None

        try:
            df = pd.read_csv(dataset_path, low_memory=False)
            self._df_cache[dataset_id] = df
            logger.info(f"Loaded dataset '{dataset_id}' | rows={len(df)}, cols={len(df.columns)}")
            return df
        except Exception as e:
            logger.error(f"Failed to load dataset '{dataset_id}': {e}")
            return None

    def get_metadata(self, dataset_id: str = "default") -> Optional[DatasetMetadata]:
        """
        Lấy metadata của dataset.
        Kết quả được cache để không cần đọc file nhiều lần.
        """
        if dataset_id in self._cache:
            return self._cache[dataset_id]

        df = self._load_df(dataset_id)
        if df is None:
            return None

        columns = []
        sample_values = {}

        for col in df.columns:
            dtype_str = str(df[col].dtype)
            col_meta: dict = {
                "name": col,
                "dtype": dtype_str,
                "null_count": int(df[col].isnull().sum()),
            }

            # Thêm min/max cho numeric columns
            if pd.api.types.is_numeric_dtype(df[col]):
                col_meta["min"] = round(float(df[col].min()), 4) if not df[col].isnull().all() else None
                col_meta["max"] = round(float(df[col].max()), 4) if not df[col].isnull().all() else None
            else:
                col_meta["min"] = None
                col_meta["max"] = None

            # Lấy sample values cho object/string columns (categorical)
            if dtype_str == "object":
                unique_vals = df[col].dropna().unique()[:5].tolist()
                sample_values[col] = [str(v) for v in unique_vals]

            columns.append(col_meta)

        metadata = DatasetMetadata(
            name=dataset_id,
            row_count=len(df),
            column_count=len(df.columns),
            columns=columns,
            sample_values=sample_values,
        )

        self._cache[dataset_id] = metadata
        logger.info(f"Cached metadata for dataset '{dataset_id}'")
        return metadata

    def get_dataframe(self, dataset_id: str = "default") -> Optional[pd.DataFrame]:
        """Trả về DataFrame (dùng cho /execute — Thịnh gọi service này)."""
        return self._load_df(dataset_id)


dataset_service = DatasetService()
