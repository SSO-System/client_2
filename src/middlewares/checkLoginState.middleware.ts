import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid'; 

export const checkLoginState = async (req, res, next) => {
    const _app_2_Session = req.cookies._app_2_Session;
}