"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const handoff_1 = require("./handoff");
function commandsMiddleware(handoff) {
    return {
        botbuilder: (session, next) => {
            if (session.message.type === 'message') {
                command(session, next, handoff);
            }
        }
    };
}
exports.commandsMiddleware = commandsMiddleware;
function command(session, next, handoff) {
    if (handoff.isAgent(session)) {
        agentCommand(session, next, handoff);
    }
    else if (handoff.isOperator(session)) {
        operatorCommand(session, next, handoff);
    }
    else {
        customerCommand(session, next, handoff);
    }
}
function agentCommand(session, next, handoff) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = session.message;
        const conversation = yield handoff.getConversation({ agentConversationId: message.address.conversation.id });
        const inputWords = message.text.split(' ');
        if (inputWords.length == 0)
            return;
        // Commands to execute whether connected to a customer or not
        if (inputWords[0] === 'options') {
            sendAgentCommandOptions(session);
            return;
        }
        else if (inputWords[0] === 'list') {
            session.send(yield currentConversations(handoff));
            return;
        }
        // Commands to execute when not connected to a customer
        if (!conversation) {
            switch (inputWords[0]) {
                case 'connect':
                    const newConversation = yield handoff.connectCustomerToAgent(inputWords.length > 1
                        ? { customerName: inputWords.slice(1).join(' ') }
                        : { bestChoice: true }, message.address);
                    if (newConversation) {
                        session.send("You are connected to " + newConversation.customer.user.name);
                    }
                    else {
                        session.send("No customers waiting.");
                    }
                    break;
                default:
                    sendAgentCommandOptions(session);
                    break;
            }
            return;
        }
        if (conversation.state !== handoff_1.ConversationState.Agent) {
            // error state -- should not happen
            session.send("Shouldn't be in this state - agent should have been cleared out.");
            console.log("Shouldn't be in this state - agent should have been cleared out");
            return;
        }
        if (message.text === 'disconnect') {
            if (yield handoff.connectCustomerToBot({ customerConversationId: conversation.customer.conversation.id })) {
                session.send("Customer " + conversation.customer.user.name + " is now connected to the bot.");
            }
            return;
        }
        next();
    });
}
function customerCommand(session, next, handoff) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = session.message;
        if (message.text === 'help') {
            // lookup the conversation (create it if one doesn't already exist)
            const conversation = yield handoff.getConversation({ customerConversationId: message.address.conversation.id }, message.address);
            if (conversation.state == handoff_1.ConversationState.Bot) {
                yield handoff.addToTranscript({ customerConversationId: conversation.customer.conversation.id }, message.text);
                yield handoff.queueCustomerForAgent({ customerConversationId: conversation.customer.conversation.id });
                session.endConversation("Connecting you to the next available agent.");
                return;
            }
        }
        return next();
    });
}
function operatorCommand(session, next, handoff) {
    return __awaiter(this, void 0, void 0, function* () {
        const message = session.message;
        console.log(message.sourceEvent);
        const conversation = yield handoff.getConversation({ customerConversationId: message.sourceEvent.conversation.id }, message.sourceEvent);
        if (conversation.state == handoff_1.ConversationState.Bot) {
            yield handoff.queueCustomerForAgent({ customerConversationId: message.sourceEvent.conversation.id });
            return;
        }
        return next();
    });
}
function sendAgentCommandOptions(session) {
    const commands = ' ### Agent Options\n - Type *connect* to connect to customer who has been waiting longest.\n - Type *connect { user name }* to connect to a specific conversation\n - Type *list* to see a list of all current conversations.\n - Type *disconnect* while talking to a user to end a conversation.\n - Type *options* at any time to see these options again.';
    session.send(commands);
    return;
}
function currentConversations(handoff) {
    return __awaiter(this, void 0, void 0, function* () {
        const conversations = yield handoff.getCurrentConversations();
        if (conversations.length === 0) {
            return "No customers are in conversation.";
        }
        let text = '### Current Conversations \n';
        conversations.forEach(conversation => {
            const starterText = ' - *' + conversation.customer.user.name + '*';
            switch (handoff_1.ConversationState[conversation.state]) {
                case 'Bot':
                    text += starterText + ' is talking to the bot\n';
                    break;
                case 'Agent':
                    text += starterText + ' is talking to an agent\n';
                    break;
                case 'Waiting':
                    text += starterText + ' is waiting to talk to an agent\n';
                    break;
            }
        });
        return text;
    });
}
//# sourceMappingURL=commands.js.map