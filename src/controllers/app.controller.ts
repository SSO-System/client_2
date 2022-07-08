import axios from 'axios';
import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

export default () => ({
  homePage: async (req, res) => {
    if (req.cookies?._app_2_Session !== undefined) {
      const _app_2_Session = req.cookies._app_2_Session;
      const session: any = await db.collection('app_2_session').doc(_app_2_Session).get();
      if (session.exists) {
        if (session.data().role !== 'guest') {
          return res.redirect(`${process.env.APP_URL}/me`);
        }
      }
    }
    return res.render("home", {
      title: "Welcome to Client 2",
      authServerUrl: process.env.AUTH_ISSUER,
      appUrl: process.env.APP_URL,
      clientId: process.env.CLIENT_ID,
      codeChallenge: res.locals.codeChallenge
    });
  },

  login_callback: async (req, res) => {
    if ("error" in req.query) {
      return res.render("callback_failed", {
        title: "Login Failed",
        appUrl: process.env.APP_URL,
        error: req.query.error,
        errorDescription: req.query.error_description
      });
    } else {
      if (req.query.code === undefined) {
        return res.render('callback_failed', {
          title: "Request Failed", 
          appUrl: process.env.APP_URL,
          error: "request_failed",
          errorDescription: "Missing authorization code"
        })
      }
      try {
        const session = req.cookies._app_2_Session;
        const data: any = await db.collection('app_2_session').doc(session).get();

        const result: any = await axios.post(`${process.env.AUTH_ISSUER}/token`, new URLSearchParams({
          client_id: `${process.env.CLIENT_ID}`,
          client_secret: `${process.env.CLIENT_SECRET}`,
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: process.env.APP_URL + "/login_callback",
          code_verifier: data.data().codeVerifier,
          scope: 'openid profile offline_access',
          code_challenge_method: 'S256',
        }));

        const userInfo: any = await axios.post(`${process.env.AUTH_ISSUER}/me`, new URLSearchParams({
          access_token: result.data.access_token
        }))

        await db.collection("app_2_session").doc(session).update({
          accessToken: result.data.access_token,
          idToken: result.data.id_token,
          refreshToken: result.data.refresh_token,
          role: 'user',
          username: userInfo.data.username 
        })

        const user = await db.collection('app_2_account').where('username', '==', userInfo.data.username).get();
        
        if (user.empty) {
          userInfo.data.createdAt = (new Date()).toISOString();
          await db.collection('app_2_account').add(userInfo.data);
        }
        
        return res.redirect(`${process.env.APP_URL}/me`);

      } catch (e: any) {
        console.log(e.message);
      }
    }
  },
  
  user_info: async (req, res) => {
    const _app_2_Session = req.cookies._app_2_Session;

    const session: any = await db.collection("app_2_session").doc(_app_2_Session).get();
    const username: string = session.data().username;

    const userInfo: any = await db.collection("app_2_account").where("username", "==", username).get();
    const user = userInfo.docs[0].data();

    return res.render("user_info", {
      appUrl: process.env.APP_URL,
      title: `Hello ${username}!`,
      clientId: process.env.CLIENT_ID,
      idToken: session.data().idToken,
      authServerUrl: process.env.AUTH_ISSUER,
      username: username,
      firstname: user.firstname,
      lastname: user.lastname,
      birthdate: user.birthdate,
      gender: user.gender,
      picture: user.picture,
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.email_verified
    });
  },

  logout_callback: async (req, res) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const _app_2_Session = req.cookies._app_2_Session;
    const new_session = uuidv4();
    res.cookie("_app_2_Session", new_session, {
      httpOnly: true,
      maxAge: oneDay,
    });

    await db.collection('app_2_session').doc(_app_2_Session).delete();
    await db.collection('app_2_session').doc(new_session).set({
      expiredAt: new Date(+ new Date() + oneDay),
      role: 'guest',
    });

    return res.redirect(`${process.env.APP_URL}`)  
  },
});
