import { create_pkce } from '../actions/create_pkce';
import { db } from '../db/connection';

export const createCodeChallenge = async (req, res, next) => {
    const _app_2_Session = res.locals._app_2_Session;

    const session: any = await db.collection("app_2_session").doc(_app_2_Session).get();

    if (session.data().codeChallenge === undefined) { 
        const codeChallenge = await create_pkce(_app_2_Session);
        res.locals.codeChallenge = codeChallenge;
    } else {
        res.locals.codeChallenge = session.data().codeChallenge;
    }
    next();
}