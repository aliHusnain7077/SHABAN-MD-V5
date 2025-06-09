const config = require('../config')
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')


cmd({
    pattern: "invite",
    react: "🖇️",
    alias: ["grouplink","glink"],
    desc: "To Get the Group Invite link",
    category: "group",
    use: '.invite',
    filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isCreator ,isDev, isAdmins, reply}) => {
try{
const msr = (await fetchJson('https://raw.githubusercontent.com/JawadYTX/KHAN-DATA/refs/heads/main/MSG/mreply.json')).replyMsg

if (!isGroup) return reply(msr.only_gp)
if (!isAdmins) { if (!isDev) return reply(msr.you_adm),{quoted:mek }} 
if (!isBotAdmins) return reply(msr.give_adm)
const code = await conn.groupInviteCode(from)

 await conn.sendMessage(from , { text: `🖇️ *Group Link*\n\nhttps://chat.whatsapp.com/${code}`}, { quoted: mek } )
} catch (e) {
await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
console.log(e)
reply(`❌ *Error Accurated !!*\n\n${e}`)
}
} )

// rest link

cmd({
    pattern: "restlink",
    react: "🖇️",
    alias: ["revokegrouplink","resetglink","revokelink","f_revoke"],
    desc: "To Reset the group link",
    category: "group",
    use: '.revoke',
    filename: __filename
},
async(conn, mek, m,{from, l, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isCreator ,isDev, isAdmins, reply}) => {
try{
const msr = (await fetchJson('https://raw.githubusercontent.com/JawadYTX/KHAN-DATA/refs/heads/main/MSG/mreply.json')).replyMsg

if (!isGroup) return reply(msr.only_gp)
if (!isAdmins) { if (!isDev) return reply(msr.you_adm),{quoted:mek }} 
if (!isBotAdmins) return reply(msr.give_adm)
await conn.groupRevokeInvite(from)
 await conn.sendMessage(from , { text: `*Group link Reseted* ⛔`}, { quoted: mek } )
} catch (e) {
await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
console.log(e)
reply(`❌ *Error Accurated !!*\n\n${e}`)
}
} )

//kick

cmd({
    pattern: "remove",
    alias: ["kick", "k"],
    desc: "Removes a member from the group",
    category: "admin",
    react: "❌",
    filename: __filename
},
async (conn, mek, m, {
    from, q, isGroup, isBotAdmins, reply, quoted, senderNumber
}) => {
    // Check if the command is used in a group
    if (!isGroup) return reply("❌ This command can only be used in groups.");

    // Get the bot owner's number dynamically from conn.user.id
    const botOwner = conn.user.id.split(":")[0];
    if (senderNumber !== botOwner) {
        return reply("❌ Only the bot owner can use this command.");
    }

    // Check if the bot is an admin
    if (!isBotAdmins) return reply("❌ I need to be an admin to use this command.");

    let number;
    if (m.quoted) {
        number = m.quoted.sender.split("@")[0]; // If replying to a message, get the sender's number
    } else if (q && q.includes("@")) {
        number = q.replace(/[@\s]/g, ''); // If mentioning a user
    } else {
        return reply("❌ Please reply to a message or mention a user to remove.");
    }

    const jid = number + "@s.whatsapp.net";

    try {
        await conn.groupParticipantsUpdate(from, [jid], "remove");
        reply(`✅ Successfully removed @${number}`, { mentions: [jid] });
    } catch (error) {
        console.error("Remove command error:", error);
        reply("❌ Failed to remove the member.");
    }
});

// active members check 

cmd({
    pattern: "active",
    alias: ["whosonline", "onlinemembers"],
    desc: "Check who's online in the group (Admins & Owner only)",
    category: "main",
    react: "🟢",
    filename: __filename
},
async (conn, mek, m, { from, quoted, isGroup, isAdmins, isCreator, fromMe, reply }) => {
    try {
        // Check if the command is used in a group
        if (!isGroup) return reply("❌ This command can only be used in a group!");

        // Check if user is either creator or admin
        if (!isCreator && !isAdmins && !fromMe) {
            return reply("❌ Only bot owner and group admins can use this command!");
        }

        // Inform user that we're checking
        await reply("🔄 Scanning for online members... This may take 15-20 seconds.");

        const onlineMembers = new Set();
        const groupData = await conn.groupMetadata(from);
        const presencePromises = [];

        // Request presence updates for all participants
        for (const participant of groupData.participants) {
            presencePromises.push(
                conn.presenceSubscribe(participant.id)
                    .then(() => {
                        // Additional check for better detection
                        return conn.sendPresenceUpdate('composing', participant.id);
                    })
            );
        }

        await Promise.all(presencePromises);

        // Presence update handler
        const presenceHandler = (json) => {
            for (const id in json.presences) {
                const presence = json.presences[id]?.lastKnownPresence;
                // Check all possible online states
                if (['available', 'composing', 'recording', 'online'].includes(presence)) {
                    onlineMembers.add(id);
                }
            }
        };

        conn.ev.on('presence.update', presenceHandler);

        // Longer timeout and multiple checks
        const checks = 3;
        const checkInterval = 5000; // 5 seconds
        let checksDone = 0;

        const checkOnline = async () => {
            checksDone++;
            
            if (checksDone >= checks) {
                clearInterval(interval);
                conn.ev.off('presence.update', presenceHandler);
                
                if (onlineMembers.size === 0) {
                    return reply("⚠️ Couldn't detect any online members. They might be hiding their presence.");
                }
                
                const onlineArray = Array.from(onlineMembers);
                const onlineList = onlineArray.map((member, index) => 
                    `${index + 1}. @${member.split('@')[0]}`
                ).join('\n');
                
                const message = `🟢 *Online Members* (${onlineArray.length}/${groupData.participants.length}):\n\n${onlineList}`;
                
                await conn.sendMessage(from, { 
                    text: message,
                    mentions: onlineArray
                }, { quoted: mek });
            }
        };

        const interval = setInterval(checkOnline, checkInterval);

    } catch (e) {
        console.error("Error in online command:", e);
        reply(`An error occurred: ${e.message}`);
    }
});

