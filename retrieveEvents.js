// written by Simon Socolow
// running 'startOAuth(textToSet)' kicks off the OAuth2 and sets textToSet.value = plaintext event list
// and the string of their events for the next 10 days is stored in CALENDAR_RESPONSE

let access_token = "";

// using the OAuth2 response (with access token inside) get the user's calendar events
async function getCalEvents(response) {
    access_token = response.access_token;

    try {
        const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });
        const data = await res.json();
        console.log("GETTING ALL CALS: ", data);
        const ids = getIDs(data);
        let allevents = await grabEvents(10, ids);
        return formatAndRenderEvents(allevents);
    } catch (error) {
        console.error("Error fetching calendar events:", error);
    }
}

// take in array of events and return them in a nice string
// also logs it to the console
function formatAndRenderEvents(allevents) {
    let ret = "No meetings should be scheduled at the same time as the following events:\n";
    for (let i = 0; i < allevents.length; i++) {
        let startTime = new Date(allevents[i].start.dateTime);
        let endTime = new Date(allevents[i].end.dateTime);
        ret += "Event " + (i + 1) + " starts at " + convertToNice(startTime) + " and ends at " + convertToNice(endTime) + "\n";
    }
    console.log(ret);
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

// compare function to sort events by time
function compareEvents(a, b) {
    aTime = new Date(a.start.dateTime);
    bTime = new Date(b.end.dateTime);

    if (aTime.getTime() < bTime.getTime()) {
        return -1;
    }
    else if (aTime.getTime() > bTime.getTime()) {
        return 1;
    } else {
        console.log('hh');
        return 0;
    }
}

// return the calendar ids of all owned calendars
function getIDs(xresponse) {
    let cals = xresponse["items"];
    let ids = [];
    for (let cal of cals) {
        console.log("id: " + cal.id);
        if (cal.accessRole === "owner") {

            if (cal.id.includes("#")) {
                cal.id = cal.id.replace(/#/g, '%23');
            }
            ids.push(cal.id);
        }
    }

    return ids;
}

async function startOAuth(textToSet) {

    // init the client
    const client = await google.accounts.oauth2.initTokenClient({
        client_id: '934829107671-0ph2tdfq3babga4qo28hob8i1shs8l8v.apps.googleusercontent.com',
        callback: async (response) => {
            console.log(response);
            textToSet.value = await getCalEvents(response);
        },
        error_callback: (err) => {
            console.error("Error: " + err);
        },
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
    });

    // trigger the auth event
    await client.requestAccessToken();
}
