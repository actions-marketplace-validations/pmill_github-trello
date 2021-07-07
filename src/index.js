import * as axios from 'axios';
import * as core from '@actions/core';
import * as github from '@actions/github';

const trelloApiKey = core.getInput('trello-api-key', { required: true });
const trelloAuthToken = core.getInput('trello-auth-token', { required: true });
const trelloBoardId = core.getInput('trello-board-id', { required: true });

function getCardNumber(input) {
    const ids = input && input.length > 0 ? input.match(/\#\d+/g) : [];
    if (ids.length === 0) {
        return null;
    }
    return ids[ids.length-1].replace('#', '');
}

async function getAttachments(cardId) {
    return await axios.get(`https://api.trello.com/1/cards/${cardId}/attachments`, {
        params: {
            key: trelloApiKey,
            token: trelloAuthToken
        },
    }).then(response => {
        return response.data;
    })
}

async function addAttachmentToCard(card, link, name) {
    console.log(`addAttachmentToCard(${card}, ${link})`);
    let url = `https://api.trello.com/1/cards/${card}/attachments`;

    return await axios.post(url, {
        key: trelloApiKey,
        token: trelloAuthToken,
        url: link,
        name: name,
    }).then(response => {
        return response.status === 200;
    }).catch(error => {
        console.error(url, `Error ${error.response.status} ${error.response.statusText}`);
        return null;
    });
}

async function getCardOnBoard(board, cardId) {
    console.log(`getCardOnBoard(${board}, ${cardId})`);

    const url = `https://trello.com/1/boards/${board}/cards/${cardId}`

    return await axios.get(url, {
        params: {
            key: trelloApiKey,
            token: trelloAuthToken
        }
    }).then(response => {
        return response.data.id;
    }).catch(error => {
        console.error(url, `Error ${error.response.status} ${error.response.statusText}`);
        return null;
    });
}

async function run() {
    const trelloCardId = github.context.ref ? getCardNumber(github.context.ref) : null;
    if (!trelloCardId) {
        return;
    }

    const card = await getCardOnBoard(trelloBoardId, trelloCardId);
    if (!card) {
        return;
    }

    core.info(JSON.stringify(github.context));

    const repoName = github.context.repo.owner + '/' + github.context.repo.repo;
    const branchName = github.context.ref.replace('refs/heads/', '');
    const branchUrl = github.context.serverUrl + '/' + repoName + '/tree/' + branchName;

    const attachments = await getAttachments(card);
    core.info(JSON.stringify(attachments));

    for (const attachment of attachments) {
        if (attachment.name === branchName && attachment.url === branchUrl) {
            return;
        }
    }

    await addAttachmentToCard(card, branchUrl, branchName);
}

run();
