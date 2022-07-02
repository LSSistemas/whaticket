import Tag from "../../models/Tag";
import Ticket from "../../models/Ticket";
import TicketTags from "../../models/TicketTags";

interface Request {
  tags: Tag[];
  ticketId: number;
}

const TicketSyncTagsService = async ({
  tags,
  ticketId
}: Request): Promise<Ticket | null> => {
  const ticket = await Ticket.findByPk(ticketId, { include: [Tag] });

  const tagList = tags.map((t) => ({ tagId: t.id, ticketId }));

  await TicketTags.destroy({ where: { ticketId } });
  await TicketTags.bulkCreate(tagList);

  ticket?.reload();

  return ticket;
};

export default TicketSyncTagsService;
