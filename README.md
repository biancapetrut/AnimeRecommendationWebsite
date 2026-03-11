# Anime Recommendation System

## What the app does
This is an anime recommendation system website. It allows users to:
- Search and browse popular anime.
- Select favorite animes to generate personalized recommendations.
- LLM-Assisted Development: Receive recommendations using an LLM, with explanations for why each anime was recommended.
- CRUD operations: Admins can manage the anime database via a secure admin panel, where you can create, edit, delete, and search entries.

## Tools / LLMs used
- **Frontend:** React.js, CSS  
- **Backend:** Flask, SQLite  
- **LLM:** `meta-llama/Llama-3.1-8B-Instruct` via Hugging Face API  

## Hallucination / Technical hurdle
1. **Finding a free LLM:** Free options are limited. I used a Hugging Face model with an API token. Even then, I ran into free token limitations, which required me to downscale prompts slightly to avoid hitting usage limits. 
2. **Handling differences between dataset titles and LLM output:**  
   - Problem: My dataset mostly uses Japanese (Romaji) titles, but the LLM returns the most popular version of the title, which is often in English. This caused mismatches, which made it impossible to display the results properly (utilizing the database).  
   - Solution: I carefully prompted the LLM to provide alternative titles, in both Japanese (Romaji) and English. I then used `fuzzywuzzy` to match both titles against my database, which helped ensure that most of the recommended options are successfully found and displayed.  
