import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Tag from "./Tag";
import Contact from "./Contact";

@Table({
  tableName: 'ContactTags'
})
class ContactTags extends Model<ContactTags> {
  @ForeignKey(() => Contact)
  @Column
  contactId: number;

  @ForeignKey(() => Tag)
  @Column
  tagId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Contact)
  contact: Contact;

  @BelongsTo(() => Tag)
  tag: Tag;
}

export default ContactTags;
