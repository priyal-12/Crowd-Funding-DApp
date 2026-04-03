// chat.js
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const panel = document.getElementById('chatbot-panel');
    const sendBtn = document.getElementById('chatbot-send');
    const inputField = document.getElementById('chatbot-input');
    const messagesDiv = document.getElementById('chatbot-messages');
    const chips = document.querySelectorAll('.chatbot-chip');

    let isPanelOpen = false;

    toggleBtn.addEventListener('click', () => {
        isPanelOpen = !isPanelOpen;
        panel.style.display = isPanelOpen ? 'flex' : 'none';
        if (isPanelOpen) inputField.focus();
    });

    closeBtn.addEventListener('click', () => {
        isPanelOpen = false;
        panel.style.display = 'none';
    });

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            inputField.value = chip.textContent;
            sendMessage();
        });
    });

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    async function getContextString() {
        if (typeof contract === 'undefined' || !contract) {
            return "Contract is not connected yet. Please connect MetaMask to see live campaign data.";
        }
        
        try {
            const balanceWei = await contract.methods.getBalance().call();
            const balanceEth = web3.utils.fromWei(balanceWei, 'ether');
            const totalContributors = await contract.methods.totalContributors().call();
            const requestCount = await contract.methods.requestCount().call();

            let contextStr = `Current Campaign State:\n`;
            contextStr += `- Total Funds Available: ${balanceEth} ETH\n`;
            contextStr += `- Total Contributors: ${totalContributors}\n`;
            contextStr += `- Total Requests: ${requestCount}\n`;
            contextStr += `- User's Wallet Address: ${currentAccount}\n`;
            contextStr += `- User is Manager: ${isManager}\n\n`;

            if (requestCount > 0) {
                contextStr += `Spending Requests Overview:\n`;
                for (let i = 0; i < requestCount; i++) {
                    const req = await contract.methods.getRequest(i).call();
                    const reqAmountEth = web3.utils.fromWei(req.amount, 'ether');
                    contextStr += `Request #${i}: "${req.description}" | Amount: ${reqAmountEth} ETH | Approvals: ${req.approvalCount} | Rejections: ${req.rejectCount} | Completed: ${req.completed}\n`;
                }
            }
            return contextStr;
        } catch (err) {
            console.error("Context fetch error:", err);
            return "Failed to read live contract state due to an error.";
        }
    }

    async function sendMessage() {
        const text = inputField.value.trim();
        if (!text) return;

        appendMessage(text, 'user-message');
        inputField.value = '';
        inputField.disabled = true;
        sendBtn.disabled = true;

        const loadingId = 'msg-' + Date.now();
        appendMessage('...', 'ai-message', loadingId);

        let context = await getContextString();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, context: context })
            });

            if (!response.ok) throw new Error('API error: ' + response.statusText);
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let aiText = '';

            const msgDiv = document.getElementById(loadingId);
            msgDiv.textContent = ''; // clear loading dots

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                aiText += decoder.decode(value, { stream: true });
                msgDiv.innerHTML = formatAIResponse(aiText);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            }

        } catch (error) {
            console.error("Chat error:", error);
            document.getElementById(loadingId).textContent = "Error: Could not connect to AI service.";
        } finally {
            inputField.disabled = false;
            sendBtn.disabled = false;
            inputField.focus();
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    function appendMessage(text, className, id = null) {
        const div = document.createElement('div');
        div.className = `message ${className}`;
        if (id) div.id = id;
        div.textContent = text;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function formatAIResponse(text) {
        // Simple formatting to handle basic markdown (newlines, bold)
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    }
});
