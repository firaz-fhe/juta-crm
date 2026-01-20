# 🎯 How to Use Bot Flow Blocks - Easy Guide for Everyone!

## 📱 WhatsApp Trigger (Green Circle)
**What it does:** This is where your bot starts! Every flow needs this.
- 🟢 This block appears automatically when you create a new flow
- Connect blocks below it to build your bot

---

## 💬 Send Message Block (Blue)
**What it does:** Sends a message to your customer

**How to use:**
1. Click the ▶ button to open the block
2. Type your message in the big text box
3. You can use special codes:
   - `{{name}}` → Customer's name
   - `{{phone}}` → Customer's phone number
   
**Example:**
```
Hello {{name}}! Welcome to our store. How can we help you today?
```

---

## 🔀 If/Else Block (Purple)
**What it does:** Checks if something is true or false, then goes different directions

**How to use:**
1. **"Check what?"** - Choose what to look at:
   - Customer's message
   - Customer's name
   - Customer's phone
   - Customer's email

2. **"Should equal:"** - Type what you're looking for
   - Example: "yes", "hello", "order"

**What happens:**
- ✓ **True (Green)** → If it matches, go this way
- ✗ **False (Red)** → If it doesn't match, go this way

**Real Example:**
- Check what: "Customer's message"
- Should equal: "yes"
- If customer says "yes" → Go to True path ✓
- If customer says anything else → Go to False path ✗

---

## ⏱️ Delay Block (Orange)
**What it does:** Makes the bot wait before doing the next thing

**How to use:**
1. Type a number (how long to wait)
2. Choose: Seconds (Sec), Minutes (Min), or Hours (Hr)

**Examples:**
- Wait 5 seconds before sending next message
- Wait 1 minute before asking again
- Wait 2 hours before follow-up

---

## 🔁 Loop Block (Teal/Cyan)
**What it does:** Repeats something multiple times

**How to use:**
1. Type **how many times** you want to repeat (1-100)
2. Connect the **▶ Next** dot to what should repeat

**Example:**
- Set to "3 times"
- Connect to "Send Message" block
- That message will be sent 3 times

---

## 🤖 AI Assistant Block (Pink)
**What it does:** Uses AI to analyze information and create smart responses

**How to use:**
1. Click ▶ to open the block

2. **"AI Instructions:"** - Tell AI what to do:
   - Examples:
     - "Analyze customer sentiment and respond politely"
     - "Summarize the customer's message in 1 sentence"
     - "Generate a friendly response to customer inquiry"
     - "Check if customer is satisfied or needs help"

3. **"Feed these variables to AI:"** - Check boxes for what AI should analyze:
   - ✅ Customer Message (what they said)
   - ✅ Customer Name
   - ✅ Customer Phone
   - ✅ Customer Email
   - Usually you'll want "Customer Message" checked!

4. **"Save AI response as:"** - Give it a name (default: `aiResponse`)
   - This lets you use AI's answer later!
   - Use it in Send Message like: `{{aiResponse}}`

**Real Example:**
```
AI Instructions: "Analyze if customer is happy or upset"
Feed variables: ✅ Customer Message
Save as: sentiment

Then in Send Message:
"I understand you're feeling {{sentiment}}. How can I help?"
```

**Another Example:**
```
AI Instructions: "Create a friendly response to this question"
Feed variables: ✅ Customer Message, ✅ Customer Name
Save as: aiReply

Then in Send Message:
"{{aiReply}}"
```

---

## 📦 Set Variable Block (Yellow)
**What it does:** Saves information to use later

**How to use:**
1. **"Save as:"** - Choose what type of information:
   - Customer Name
   - Customer Phone
   - Customer Email
   - Customer Address
   - Notes

2. **"Value to save:"** - Type what to save
   - Example: "John Doe", "VIP Customer", "Urgent order"

**Using saved data:**
- After saving "Customer Name" as "John"
- Use `{{name}}` in any Send Message block
- It will show "John" in the message!

---

## 🎯 Quick Tips

### Connecting Blocks:
1. Drag a block from the left sidebar
2. Drop it on the canvas
3. Click and drag from the **bottom dot** of one block
4. Connect to the **top dot** of the next block

### Testing Your Flow:
1. Click the 🧪 **Test Flow** button at the top
2. Type messages like a customer would
3. See how your bot responds!

### Saving Your Work:
- Click 💾 **Save** button at the top
- Your flow is saved automatically!

---

## 📚 Complete Example Flow

Here's a simple welcome flow:

```
1. WhatsApp Trigger (starts automatically)
   ↓
2. Send Message: "Hi {{name}}! How can I help you today?"
   ↓
3. AI Assistant: 
   - Instructions: "Analyze customer message and determine if they need support"
   - Feed: Customer Message
   - Save as: needsHelp
   ↓
4. If/Else: Check if {{needsHelp}} equals "yes"
   ├── ✓ True → Send Message: "I'll connect you with our support team!"
   └── ✗ False → Send Message: "Great! Let me know if you need anything."
```

**Advanced Example with AI:**
```
1. WhatsApp Trigger
   ↓
2. Send Message: "What product are you interested in?"
   ↓
3. AI Assistant:
   - Instructions: "Generate product recommendation based on customer interest"
   - Feed: Customer Message, Customer Name
   - Save as: recommendation
   ↓
4. Send Message: "{{recommendation}}"
   ↓
5. Send Message: "Would you like to order? Reply YES or NO"
   ↓
6. If/Else: Check if message equals "YES"
   ├── ✓ True → Set Variable: notes = "Interested in ordering"
   │             ↓
   │           Send Message: "Great! Our team will contact you at {{phone}}"
   └── ✗ False → Send Message: "No problem! We're here when you're ready."
```

---

## ❓ Common Questions

**Q: Why won't my blocks connect?**
A: Make sure you're dragging from a **bottom dot** to a **top dot**!

**Q: How do I delete a block?**
A: Click the **×** button in the top right corner of any block

**Q: Can I use multiple If/Else blocks?**
A: Yes! You can chain as many as you need for complex logic

**Q: What if I make a mistake?**
A: Just delete the block and add a new one, or click ▶ to edit it!

---

Made simple for everyone! 🎉
