// written by Simon Socolow
// running 'startOAuth(textToSet)' kicks off the OAuth2 and sets textToSet.value = plaintext event list

let access_token = "";

// using the OAuth2 response (with access token inside) get the user's mail history
async function listMSGs(response) {
    access_token = response.access_token;

    try {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?q=to:' + OTHERADDRESS + "&maxResults=" + EMAILNUM, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        const data = await res.json();
        console.log("GETTING MESSAGES BETWEEN YOU AND " + OTHERADDRESS + ": ", data);
        let msgs = await getMessages(data.messages);
        return formatAndRenderEvents(msgs);
    } catch (error) {
        console.error("Error fetching:", error);
    }
}

// try to decode base64
// function decodeBase64(str) {
//     try {
//         return decodeURIComponent(atob(str));
//     } catch (e) {
//         console.log(str);
//         console.error("Error decoding Base64 string:", e);
//         return null;
//     }
// }

// Function to decode a Base64 string to Unicode
function decodeBase64ToUnicode(base64) {
    const binaryString = atob(base64);
    const binaryBytes = new Uint8Array([...binaryString].map(char => char.charCodeAt(0)));
    const decodedString = new TextDecoder().decode(binaryBytes);
    return decodedString;
}

// get plaintext from email
function extractPlaintext(payload) {
    let text = '';
    text += "From: " + payload.headers.find(obj => obj.name === "From").value + "\n";
    text += "To: " + payload.headers.find(obj => obj.name === "To").value + "\n";
    text += "Subject: " + payload.headers.find(obj => obj.name === "Subject").value + "\n";
    text += "Body:\n";

    for (let part of payload.parts) {
        if (part.mimeType === 'text/plain') {
            str = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
            text += decodeBase64ToUnicode(str) + "\n";
        }
        if (part.mimeType === 'multipart/alternative') {
            for (let subPart of part.parts) {
                if (subPart.mimeType === 'text/plain') {
                    str = subPart.body.data.replace(/-/g, '+').replace(/_/g, '/');
                    text += decodeBase64ToUnicode(str) + "\n";
                }
            }
        }
        text += "\n";
        return text;
    }
}

//from the message id and threadId, get the actual messages
async function getMessages(data) {
    let msgs = [];
    for (let obj of data) {
        let url = "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + obj.id + "?format=full";

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });
            const data = await res.json();
            console.log(obj.id + " MAIL: ", data);

            let plaintext = extractPlaintext(data.payload);
            console.log("pt: ", plaintext);
            msgs.push(plaintext);

        } catch (error) {
            console.error("Error fetching emails:", error);
        }
    }
    return msgs;
}

// makes the array of messages one string
function formatAndRenderEvents(msgs) {
    let ret = "";
    for (let i = 0; i < msgs.length; i++) {
        ret += msgs[i];
    }
    return ret;
}

// converts from js Date format to more readable
// Wed Jul 17 2024 18:00:00 GMT+0900 (Japan Standard Time)
// |
// v
// Wed July 17 18:00:00 (Japan Standard Time)
function convertToNice(date) {
    let ret = date.toString().replace(/ 2... /, " ");
    ret = ret.replace(/ ...\+.... /, " ");
    return ret;
}

// returns a string with all the events in all the calendars in the next n days
// that have specific start and end times
// and order them by time (soonest first)
async function grabEvents(n, ids) {
    let allevents = [];
    for (let calID of ids) {

        let now = new Date();
        let future = new Date(now.getTime() + n * 24 * 60 * 60 * 1000);
        let url = "https://www.googleapis.com/calendar/v3/calendars/" + calID + "/events?" + "timeMin=" + now.toISOString() + "&timeMax=" + future.toISOString() + "&singleEvents=True";

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            });
            const data = await res.json();
            console.log(calID + " EVENTS: ", data);

            // only put in events that aren't all-day
            for (let event of data["items"]) {
                console.log(event);
                if (event.hasOwnProperty("start")) {
                    if (event.start.hasOwnProperty("dateTime")) {
                        allevents.push(event);
                    }
                }
            }

        } catch (error) {
            console.error("Error fetching calendar events:", error);
        }
    }

    allevents.sort(compareEvents);
    console.log("after sorting: ", allevents);
    return allevents;
}




// triggers the oath implicit flow
async function startOAuth(textToSet) {

    // init the client
    const client = await google.accounts.oauth2.initTokenClient({
        client_id: '757937405503-4qnrh6if71vrbpl8es2s10tg8iqkg0ap.apps.googleusercontent.com',
        callback: async (response) => {
            console.log(response);
            textToSet.value = await listMSGs(response);
        },
        error_callback: (err) => {
            console.error("Error: " + err);
        },
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
    });

    // trigger the auth event
    await client.requestAccessToken();
}
