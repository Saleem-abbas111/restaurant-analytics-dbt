import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.gemini_service import analyze_question

logger = logging.getLogger("restaurant_api.analyst")

router = APIRouter(
    prefix="/api/analyst",
    tags=["Analyst"],
)


class AnalystRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Business question in plain English",
    )

    insights: bool = Field(
        default=True,
        description="Generate findings and recommendations",
    )


@router.post("")
def analyst(request: AnalystRequest):
    """
    Analyse a restaurant business question using Gemini and Snowflake.
    """

    question = request.question.strip()

    if not question:
        raise HTTPException(
            status_code=422,
            detail="Please enter a question.",
        )

    try:
        return analyze_question(
            question=question,
            insights=request.insights,
        )

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("Analyst request failed")

        raise HTTPException(
            status_code=500,
            detail=(
                "The analysis could not be completed. "
                "Check the backend terminal for details."
            ),
        ) from exc