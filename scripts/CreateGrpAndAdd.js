const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const csv = require("csv-parser");

/*
1) Give group name in GROUP_NAME.
2) put the numbers in contacts.csv in data folder.
3) Run the command "node CreateGrpAndAdd.js"
4) Sit back and enjoy
*/


//group name
const GROUP_NAME = "HELLO"
//file which has contacts of users
const INPUT_FILE_PATH = "data/contacts.csv"
//file for writing numbers of users who doesnt have WA account
const ERROR_FILE_PATH = "outputs/error.csv"
//file for writing numbers of users who were failed to add into the group
//Invitation sent to individual users for joining
const FAILED_FILE_PATH = "outputs/failed.csv"

//stores registered numbers
let contacts = [];
//stores numbers failed to add in the group
let failed = [];
//store non registered numbers
let errNos = []

//Client with local auth
const client = new Client({ authStrategy: new LocalAuth() });

//generate qr for authentication
client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

//function for checking whether the user is registered or not.
const isRegistered = async (number) => {
    number_details = await client.getNumberId(number); // get mobile number details
    if (number_details) {
        contacts.push(number_details?._serialized)
    } else {
        console.log(number, "Mobile number is not registered");
        errNos.push(number)
    }
}


client.on("authenticated", async () => {
    //read input
    fs.createReadStream(INPUT_FILE_PATH)
        .pipe(csv())
        .on("data", async (data) => {
            const { phone } = data
            const sanitized_number = phone.toString().replace(/[^0-9]/g, ""); // remove unnecessary chars from the number
            let final_number;
            if (sanitized_number.length == 10) {
                final_number = `91${sanitized_number}`; // add 91 before the number here 91 is country code of India
                await isRegistered(final_number)

            } else {
                final_number = `${sanitized_number}`;
                await isRegistered(final_number)
            }
        })

})

client.on("ready", async () => {
    console.log("Client is ready!");
    //create group
    await client.createGroup(`${GROUP_NAME.trim()}`, contacts)
        .then(async (res) => {
            console.log(res);
            failed = Object.keys(res.missingParticipants);
        })
        .then(() => {
            //write not registered numbers to  csv
            fs.writeFile(ERROR_FILE_PATH, 'phone\n', err => { })
            const errorAdding = fs.createWriteStream(ERROR_FILE_PATH, { flags: 'a' })
            errNos.forEach(user => {
                errorAdding.write(`${user}\n`)
            })

            //write failed numbers to  csv
            fs.writeFile(FAILED_FILE_PATH, 'phone\n', err => { })
            const failedAdding = fs.createWriteStream(FAILED_FILE_PATH, { flags: 'a' })
            failed.forEach(user => {
                failedAdding.write(`${user}\n`)
            })

        })
        .catch(e => {
            console.log(e);
        })

});

//Send invitation to failed to users
async function AddFailed(invitationlink) {
    failed.forEach(async (fail) => {
        try {
            await client.sendMessage(
                fail,
                `https://chat.whatsapp.com/${invitationlink}`
            );
            console.log(`\n\nWhatsapp invitations Group sent to \n${fail}\n\n`);
        } catch {
            console.log(`\nInvitation Link Not sent to ${fail}`);
        }
    })
}

//get invitation code for the group
client.on("message", async (msg) => {
    const group = await msg.getChat();
    invitationlink = await group.getInviteCode()
    AddFailed(invitationlink);
});


client.initialize();
