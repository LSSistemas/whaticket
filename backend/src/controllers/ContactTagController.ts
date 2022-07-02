import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import ShowService from "../services/TagServices/ShowService";
import ContactTagListService from "../services/TagServices/ContactTagListService";
import ContactSyncTagsService from "../services/TagServices/ContactSyncTagsService";

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};



export const show = async (req: Request, res: Response): Promise<Response> => {
  const { tagId } = req.params;

  const tag = await ShowService(tagId);

  return res.status(200).json(tag);
};


export const list = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam } = req.query as IndexQuery;

  const tags = await ContactTagListService({ searchParam });

  return res.json(tags);
};

export const sync = async (req: Request, res: Response): Promise<Response> => {
  const data = req.body;

  try {
    if(data) {
    const tags = await ContactSyncTagsService(data);

  return res.json(tags);
}
  }
  catch (err) {
    throw new AppError("ERR_SYNC_TAGS", 500);
  }
};

