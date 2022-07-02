import Tag from "../../models/Tag";
import Contact from "../../models/Contact";
import ContactTags from "../../models/ContactTags";

interface Request {
  tags: Tag[];
  contactId : number;
}

const ContactSyncTagsService = async ({
  tags,
  contactId
}: Request): Promise<Contact | null> => {
  const contact = await Contact.findByPk(contactId, { include: [Tag] });

  const tagList = tags.map((t) => ({ tagId: t.id, contactId }));

  await ContactTags.destroy({ where: { contactId } });
  await ContactTags.bulkCreate(tagList);

  contact?.reload();

  return contact;
};

export default ContactSyncTagsService;
