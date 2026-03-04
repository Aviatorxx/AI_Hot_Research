#!/bin/bash
cd /Users/aviator/Documents/code/codefather/AI_Hot_Research
/opt/anaconda3/envs/fastapi/bin/python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
