# Composable AI Studio

A visual, drag-and-drop node builder for creating AI applications.

## Technologies
- **Frontend**: React (Vite), React Flow, Framer Motion
- **Backend**: Python (FastAPI), NetworkX
- **Design**: Glassmorphism, Dark Mode

## Features
- **Visual Builder**: Drag blocks from sidebar, connect them.
- **Blocks**:
  - **Prompt Block**: Define text input/templates.
  - **Model Block**: Choose between GPT-3.5, GPT-4, or Gemini.
  - **Output Block**: View results.
- **Execution**: Runs the flow sequentially on the backend.

## Setup & Run

1. **Install Dependencies**:
   ```bash
   npm install
   pip install -r backend/requirements.txt
   ```

2. **Environment Variables**:
   Ensure `.env` in the root contains:
   ```env
   OPENAI_API_KEY=sk-...
   GEMINI_API_KEY=...
   ```

3. **Run Application**:
   **Frontend**:
   ```bash
   npm run dev
   ```
   **Backend**:
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```

4. **Access**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage
1. Drag a **Prompt Block**, **Model Block**, and **Output Block** to the canvas.
2. Connect **Prompt Source -> Model Target**.
3. Connect **Model Source -> Output Target**.
4. Enter text in Prompt Block.
5. Click **Run Flow**.
Loom Video Link
https://drive.google.com/file/d/1HZxDgKPttI4XuU_lQVXkQjjiY5r4rOT5/view?usp=sharing


