import prompts from "prompts";
import { Api, TelegramClient, utils } from "telegram";
import {Logger} from 'telegram/extensions'
import { StringSession } from "telegram/sessions";
import BigInteger from "big-integer";
import fs from "fs/promises";


// CONFIGS:
const sessionString = "";   // paste session id printed on console after logged in
const apiId = 0;            // get you api id from https://my.telegram.org/apps (after login) and place it here
const apiHash = "";         // in https://my.telegram.org/apps you could see data another field ( api hash ) past it here
                            // NOTICE : when pasting this information don't forget trimming the text (remove spaces from left and right of that text (api id and api hash))
const groupId = "nodejsGroup";

const session = new StringSession(sessionString);
const client = new TelegramClient(session, apiId, apiHash.trim(), {baseLogger:new Logger('warn')});
(async () => {
    await client.start({
        password: () =>
            prompts({
                name: "value",
                type: "password",
                message: "password",
            }).then((result) => result.value),
        onError: (err) => console.error("error", err),
        phoneNumber: () =>
            prompts({
                name: "value",
                type: "text",
                message: "phone",
            }).then((result) => result.value),
        phoneCode: () =>
            prompts({
                name: "value",
                type: "text",
                message: "code",
            }).then((result) => result.value),
    });

    console.log(client.session.save());

    let totalMsg = 0;
    let lastMsgId = BigInteger("0"); //NOTICE: if for what ever reason you stopped the process place the last message id ( without n at the end ) instead of 0

    while (true) {
        const chunk = await getEventsFromMaxId(lastMsgId);
        totalMsg += chunk.events.length;

        const finalResult = parseResult(chunk).map((message) =>
            JSON.stringify(message)
        );

        await appendResult(finalResult);
        if (!chunk.events.length) {
            console.log("done");
            process.exit(0);
            break;
        }
        lastMsgId = chunk.events[chunk.events.length - 1].id;
        console.log(totalMsg, lastMsgId);
    }
})();

async function appendResult(finalResultArray: string[]) {
    await fs.appendFile(
        `./${groupId}.crawl.txt‍`,
        finalResultArray.join("\n") + "\n"
    );
}

function parseResult(result: Api.channels.AdminLogResults) {
    return result.events
        .filter(
            (event) =>
                "message" in event.action && "message" in event.action.message
        )
        .map(
            (event) =>
                "message" in event.action &&
                "message" in event.action.message &&
                event.action.message
        );
}

async function getEventsFromMaxId(maxId?: BigInteger.BigInteger) {
    const result = await client.invoke(
        new Api.channels.GetAdminLog({
            channel: groupId,
            q: "",
            maxId: maxId,
            limit: 100,
            eventsFilter: new Api.ChannelAdminLogEventsFilter({
                join: false,
                leave: false,
                invite: false,
                ban: false,
                unban: false,
                kick: false,
                unkick: false,
                promote: false,
                demote: false,
                info: false,
                settings: false,
                pinned: false,
                groupCall: false,
                invites: false,
                delete: true,
                edit: false,
            }),
        })
    );
    return result;
}
