# 🤖 Agent Chat Examples - Real Commands You Can Try Now

This guide shows **real examples** you can copy-paste into the agent chat interface or test via API.

## ✨ NEW: Natural Language Support

The agent now understands natural language! You can:
- 🎯 **Reference tasks by title** instead of UUID: `"Move 'create api endpoint' to done"`
- 🔄 **Flexible status names**: Use spaces, hyphens, or underscores (`"ai prep"`, `"ai-prep"`, `"ai_prep"` all work!)
- 💬 **Conversational commands**: `"update my task to in progress"` works just like technical commands

## 🚀 Quick Start

1. Open http://localhost:5173
2. Login: `admin` / `password`
3. Click **"🤖 Show Agent"** button at the top
4. Copy-paste any examples below!

---

## 📋 Basic Commands

### 1. **See What Tasks Are Available**

```
show available tasks
```

**What it does:** Lists all tasks that are AI-eligible and not currently claimed by another agent.

**Expected Response:**
```
✅ Found 3 available tasks:

1. Implement user authentication (Linear)
   ID: d803162f-b069-4335-8206-e91edfd0a1a4
   Status: backlog

2. Design landing page (MustDoNow)
   ID: 194c80e4-771e-4fdc-be8b-c018dfc81550
   Status: backlog

3. Fix database migration bug (FixedDate)
   ID: 63e3e59d-16b0-43ba-aa71-871ed84cd537
   Status: backlog
```

---

### 2. **Alternative Ways to Ask**

These all do the same thing:
```
what tasks can I work on?
list available tasks
show me tasks
query available tasks
what's in the backlog?
```

---

## 🎯 Working With Specific Tasks

### 3. **Get Details About a Task**

```
show task: d803162f-b069-4335-8206-e91edfd0a1a4
```

**What it does:** Shows full details including description, tags, dates, etc.

---

### 4. **Claim a Task to Work On**

```
claim task: d803162f-b069-4335-8206-e91edfd0a1a4
```

**What it does:** 
- Assigns the task to the agent
- Creates a 30-minute lease
- Prevents other agents from claiming it
- Records in audit log

**Expected Response:**
```
✅ Successfully claimed task d803162f-b069-4335-8206-e91edfd0a1a4
   Lease expires in 30 minutes
```

---

### 5. **Move a Task Through the Workflow**

⚠️ **Important:** You must CLAIM a task before you can move it!

```
move task: d803162f-b069-4335-8206-e91edfd0a1a4 to in-progress
```

**Valid columns:**
- `backlog` - Initial state
- `todo` - Ready to start
- `ai-prep` or `ai prep` - Being prepared by AI
- `in-progress` or `in progress` - Actively being worked on
- `verify` - Ready for review
- `done` - Completed

**Alternative ways to say it:**
```
move task: d803162f... to done
update task: d803162f... to verify
change task: d803162f... status to todo
```

---

### 🆕 5b. **Move Task by Title (Natural Language)**

**NEW!** You can now move tasks by referencing their title instead of UUID:

```
Move 'Implement user authentication' to in progress
```

**What it does:** Finds the task by title and moves it to the specified column.

**More natural examples:**
```
Move "Design landing page" to ai prep
Update 'Fix database bug' to done
Move create mcp endpoint to verify
```

**Pro tips:**
- ✅ Works with quotes (`'title'` or `"title"`) or without
- ✅ Case-insensitive matching
- ✅ Accepts spaces in status names: `"ai prep"`, `"in progress"`
- ⚠️ You must claim the task first (see command #3)
- ⚠️ If multiple tasks match, it picks the first match - use UUID for precision

**Example workflow:**
```
1. "show available tasks"
2. "claim task: abc123..."
3. "Move 'task title' to in progress"
```

---

### 6. **Add a Comment**

```
comment on task: d803162f-b069-4335-8206-e91edfd0a1a4 - Starting work on authentication module
```

**What it does:** Adds a timestamped comment to the task's audit log.

**More examples:**
```
add comment to task: d803162f... - API endpoints implemented
note on task: d803162f... - Waiting for code review
comment on task: d803162f... - "Found a bug in token validation"
```

---

### 7. **Release a Task**

```
release task: d803162f-b069-4335-8206-e91edfd0a1a4
```

**What it does:** Releases your claim/lease on the task so other agents can work on it.

---

### 8. **Create a Subtask**

```
create subtask for: d803162f-b069-4335-8206-e91edfd0a1a4 - Write unit tests for auth module
```

**What it does:** Creates a new task linked to the parent task.

---

## 🎬 Complete Workflow Example

Here's a **real step-by-step workflow** you can follow:

### Step 1: See what's available
```
show available tasks
```

### Step 2: Claim a task
```
claim task: d803162f-b069-4335-8206-e91edfd0a1a4
```

### Step 3: Move it to in-progress
```
move task: d803162f-b069-4335-8206-e91edfd0a1a4 to in-progress
```

### Step 4: Add progress updates
```
comment on task: d803162f-b069-4335-8206-e91edfd0a1a4 - Implemented JWT token generation

comment on task: d803162f-b069-4335-8206-e91edfd0a1a4 - Added middleware for token validation
```

### Step 5: Create a subtask
```
create subtask for: d803162f-b069-4335-8206-e91edfd0a1a4 - Write integration tests
```

### Step 6: Move to verify
```
move task: d803162f-b069-4335-8206-e91edfd0a1a4 to verify
```

### Step 7: Move to done
```
move task: d803162f-b069-4335-8206-e91edfd0a1a4 to done
```

### Step 8: Release the task
```
release task: d803162f-b069-4335-8206-e91edfd0a1a4
```

---

## 🤔 General Questions (with LLM Enabled)

If you've added your Gen AI Platform API key to `.env`, you can also ask general questions:

### Project Status
```
What's the overall status of the project?
How many tasks are in progress?
Which tasks are completed?
```

### Task Recommendations
```
What should I work on next?
Which task has the highest priority?
Are there any blocked tasks?
```

### Help & Guidance
```
How does this Kanban system work?
What can you help me with?
Explain the workflow columns
```

---

## 🧪 Test via Terminal (For Developers)

If you want to test via command line:

```bash
# Get auth token
TOKEN=$(curl -s http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' | jq -r '.data.token')

# Send a chat message
curl -s http://localhost:3001/api/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"message":"show available tasks"}' | jq .
```

---

## 💡 Pro Tips

### ✅ DO:
- Claim tasks before moving them
- Use full task IDs (UUIDs) for precision
- **NEW:** Use task titles in quotes for convenience!
- Release tasks when done
- Add comments to track progress

### ❌ DON'T:
- Try to move tasks you haven't claimed
- Use partial task IDs (won't match)
- Forget to release tasks (they'll stay locked for 30 min)
- Worry about status format - "ai prep", "ai-prep", "ai_prep" all work!

---

## 🎯 Try It Right Now!

**Easiest way to start:**

1. Open http://localhost:5173
2. Click "🤖 Show Agent"
3. Type: `show available tasks`
4. Copy one of the task IDs from the response
5. Type: `claim task: <paste-id-here>`
6. Type: `move task: <paste-id-here> to in-progress`

**You're now using AI-powered task management!** 🚀

---

## 📊 What You'll See

Each command shows:

**✅ Natural Language Response**
- What the agent did
- Current status
- Next suggested actions

**🔍 Action Cards** (Technical Details)
- API endpoint called
- HTTP method
- Parameters sent
- Result or error
- Token usage (if LLM enabled)

---

## 🐛 Common Issues

### "Agent does not have an active lease on this task"
**Solution:** You need to claim the task first with `claim task: <id>`

### "Invalid agent token"
**Solution:** Already fixed! Agent now uses proper JWT authentication.

### "Unknown intent"
**Solution:** Check command format. Try one of the examples above.

### "No tasks available"
**Solution:** Create tasks first in the UI or via API.

---

## 📚 Quick Reference

| What You Want | Command Example | Alternative (Natural Language) |
|---------------|----------------|--------------------------------|
| List tasks | `show available tasks` | `what can I work on?` |
| Get details | `show task: <id>` | - |
| Claim task | `claim task: <id>` | - |
| Move task (UUID) | `move task: <id> to done` | `update task: <id> to in progress` |
| **🆕 Move task (Title)** | `Move 'task title' to done` | `Update "my task" to ai prep` |
| Add comment | `comment on task: <id> - note` | - |
| Release task | `release task: <id>` | - |
| Create subtask | `create subtask for: <id> - title` | - |
| Ask question | `what should I work on next?` | Requires LLM setup |

**Status Format Flexibility:**
- ✅ `ai prep` (spaces)
- ✅ `ai-prep` (hyphens)  
- ✅ `ai_prep` (underscores)
- ✅ `in progress`, `in-progress`, `in_progress` all work!

---

**Have fun managing your Kanban board with AI!** 🎉
