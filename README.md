# Solve Intelligence Engineering Challenge

## Objective

You have received a mock-up of a patent reviewing application from a junior colleague. Unfortunately, it is incomplete and needs additional work. Your job is to take your colleague's work, improve and extend it, and add a feature of your own creation!

After completing the tasks below, add a couple of sentences to the end of this file briefly outlining what improvements you made.

## Docker

Make sure you create a .env file (see .env.example) with the OpenAI API key we have provided.

To build and run the application using Docker, execute the following command:

```
docker-compose up --build
```

## Task 1: Implement Document Versioning

Currently, the user can save a document, but there is no concept of **versioning**. Paying customers have expressed an interest in this and have requested the following:

1. The ability to create new versions
2. The ability to switch between existing versions
3. The ability to make changes to any of the existing versions and save those changes (without creating a new version)

You will need to modify the database model (`app/models.py`), add some API routes (`app/__main__.py`), and update the client-side code accordingly.

## Task 2: Real-Time AI Suggestions

Your colleague started some work on integrating real-time improvement suggestions for your users. However, they only had time to set up a WebSocket connection. It is your job to finish it.

You will find a WebSocket endpoint that needs to be completed in the `app/__main__.py` file in the `server`. This endpoint should receive the editor contents from the client and stream out AI suggestions to the UI. There are a few complications here:

- You are using a third party AI library, which exposes a fairly poor API. The code for this library is in `server/app/internal/ai.py`.
  - The API expects a **plain** text document, with no HTML mark-up or formatting
  - There are intermittent errors in the formatting of the JSON output

You will need to find some way of notifying the user of the suggestions generated. As we don't want the user's experience to be impacted, this should be a background process. You can find the existing frontend WebSocket code in `client/src/Document.tsx`.

## Task 3: Showcase your full-stack skills

Implement an additional feature or product improvement that would benefit our customers as they draft their patent applications.

This last part is open-ended, and you can take it in any direction you like. We’re interested in seeing how you come up with and implement features without us directing you.

Some ideas:

- Display redlines between document versions.
- Real-time collaboration with colleagues on a document.
- Have the AI stream and make corrections directly inside the editor.

Or anything else you like.

Enjoy!

---

## Summary of Improvements

**Task 1:** Added full document versioning support. Users can now create new versions, switch between existing versions, and save changes to any version without creating a new one. Updated the database models and added the necessary API endpoints.

**Task 2:** Finished the AI suggestions feature. The WebSocket endpoint now strips HTML from the editor, validates the content, and handles the unreliable AI responses. Added a suggestions panel to the UI where users can view, dismiss individual suggestions, or clear all suggestions at once. AI suggestions are triggered automatically a couple seconds after the user stops typing.

**Task 3:** Built an audit trail and undo/redo system. Every time a user saves or creates a new version, an audit event is logged with who made the change, when, and how many words were added or removed. Users can view the last 10 events in an audit log modal. For undo/redo, I went with a snapshot approach rather than full event sourcing - each save creates a content snapshot that users can step through with undo/redo buttons or keyboard shortcuts (Cmd+Z / Cmd+Shift+Z).
