import { or } from "sequelize/types/lib/operators";
import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import AppError from "../../errors/AppError";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import ShowTicketService from "../TicketServices/ShowTicketService";
import ShowUserService from "../UserServices/ShowUserService";

interface Request {
  ticketId: string;
  pageNumber?: string;
  userId: string;
}

interface Response {
  messages: Message[];
  ticket: Ticket;
  count: number;
  hasMore: boolean;
}

const ListMessagesService = async ({
  pageNumber = "1",
  ticketId,
  userId
}: Request): Promise<Response> => {
  const ticket = await ShowTicketService(ticketId);

  if (!ticket) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  let queues1 = [];
  
  const user = await ShowUserService(userId);
  queues1 = user.queues.map(queue => queue.id);

  console.log(queues1);

  // await setMessagesAsRead(ticket);

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: messages } = await Message.findAndCountAll({
    //where: { ticketId },
    limit,
    include: [
      "contact",
      {
        model: Message,
        as: "quotedMsg",
        include: ["contact"]
      },
      {
        model: Ticket,
        where: { 
          contactId: ticket.contactId,
          queueId: { [Op.or]: [queues1, null]}
          },
        required: true
      }
    ],
    offset,
    order: [["createdAt", "DESC"]]
  });

  const hasMore = count > offset + messages.length;

  return {
    messages: messages.reverse(),
    ticket,
    count,
    hasMore
  };
};

export default ListMessagesService;
