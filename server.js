// To run this code, open your terminal and run:
// npm init -y
// npm install axios
// npm i ngrok
// npm run start

const express = require('express');
const bodyParser = require('body-parser');
const ngrok = require('ngrok');
const axios = require('axios');

// Replace with your actual values
const HUBSPOT_APPLICATION_TOKEN = 'HUBSPOT_APPLICATION_TOKEN'; // API token from HubSpot private app
const FRONTEGG_CLIENT_ID = 'FRONTEGG_CLIENT_ID'; // "Client ID" from Frontegg Portal ➜ [ENVIRONMENT] ➜ Env Settings page
const FRONTEGG_SECRET = 'FRONTEGG_SECRET'; // "API key" from Frontegg Portal ➜ [ENVIRONMENT] ➜ Env Settings page
const TENANT_ID_TO_INVITE_IN_FRONTEGG = 'TENANT_ID_TO_INVITE_IN_FRONTEGG'; // The account to invite to in Frontegg
const FRONTEGG_ROLES_ARRAY = ["FRONTEGG_ROLES_ARRAY"] // At least one roleId from Frontegg Portal ➜ [ENVIRONMENT] ➜ Entitlements ➜ Roles

const app = express();
const port = 5000;

app.use(bodyParser.json());

app.post('/', async (req, res) => {
  try {
    const events = req.body;

    if (!events || events.length === 0) {
      return res.status(400).send('No events found in request body');
    }

    const event = events[0]; // Assuming only one event per request

    const objectId = event.objectId;

    console.log('Calling HubSpot API to get user details');
    const hubspotResponse = await getHubspotUserDetails(objectId);
    console.log('HubSpot response:', hubspotResponse.data);

    const fronteggBearerToken = await getFronteggBearerToken();
    console.log('Calling Frontegg API to get Bearer Token');
    console.log('Frontegg Bearer Token:', fronteggBearerToken);

    const email = hubspotResponse.data.properties.email;
    const name = `${hubspotResponse.data.properties.firstname} ${hubspotResponse.data.properties.lastname}`;

    console.log('Calling Frontegg API to invite user');
    const fronteggInviteResponse = await inviteUserToFrontegg(fronteggBearerToken, email, name);
    console.log('Frontegg Invitation Response:', fronteggInviteResponse.data);

    res.status(200).send('Event processed successfully');
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).send('Internal server error');
  }
});

async function getHubspotUserDetails(objectId) {
  const url = `https://api.hubspot.com/crm/v3/objects/contacts/${objectId}`;
  const response = await axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${HUBSPOT_APPLICATION_TOKEN}`,
    },
  });
  return response;
}

async function getFronteggBearerToken() {
  const url = 'https://api.frontegg.com/auth/vendor/';
  const response = await axios.post(url, {
    clientId: FRONTEGG_CLIENT_ID,
    secret: FRONTEGG_SECRET,
  }, {
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
    },
  });
  return response.data.token;
}

async function inviteUserToFrontegg(bearerToken, email, name) {
    const url = 'https://api.frontegg.com/identity/resources/users/v2';
    try {
      const response = await axios.post(url, {
        provider: 'local',
        email,
        name,
        roleIds: FRONTEGG_ROLES_ARRAY,
      }, {
        headers: {
          'accept': 'application/json',
          authorization: `Bearer ${bearerToken}`,
          'frontegg-tenant-id': TENANT_ID_TO_INVITE_IN_FRONTEGG,
          'content-type': 'application/json',
        },
      });
      return response;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.errors) {
        // Convert the errors array to a string and log it
        console.error('Error inviting user to Frontegg:', JSON.stringify(error.response.data.errors));
      } else {
        console.error('Error inviting user to Frontegg:', error.message);
      }
      throw error; // rethrow the error after logging to handle it elsewhere if necessary
    }
  }

(async () => {
  const url = await ngrok.connect(port);
  console.log(`Server listening on: ${url}`);

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
})();
