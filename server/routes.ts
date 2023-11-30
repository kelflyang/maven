import { ObjectId } from "mongodb";
import { Document, Section, SectionTranslation, Tag, User, WebSession } from "./app";
import { Author } from "./concepts/document";
import { TagDoc } from "./concepts/tag";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import { Router, getExpressRouter } from "./framework/router";
class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  /////////////////////
  //       Tag       //
  /////////////////////
  @Router.post("tag")
  async createTag(name: string, isLanguage: boolean) {
    return await Tag.createTag(name, isLanguage);
  }
  @Router.post("/tag/attach")
  async attachTag(tag: string, attachedTo: string) {
    return await Tag.attachTag(new ObjectId(tag), new ObjectId(attachedTo));
  }
  @Router.get("/tag")
  async getTags(query: Partial<TagDoc>) {
    return await Tag.getTags(query);
  }
  @Router.get("/tag/language")
  async getLanguageTags() {
    return await Tag.getLanguageTags();
  }
  @Router.get("/tag/object/:object")
  async getObjectTags(object: string) {
    return await Tag.getObjectTags(new ObjectId(object));
  }
  @Router.get("/tag/tag/:tag")
  async getTaggedObjects(tag: string) {
    return await Tag.getTaggedObjects(new ObjectId(tag));
  }

  ////////////////////
  //    Document    //
  ////////////////////
  @Router.post("/document")
  async createDocument(session: WebSessionDoc, title: string, authors: Author[], year: number, domain: string, content: string, originalLanguage: string) {
    const user = WebSession.getUser(session);

    // see if tag exists for language, and if not create a tag for it
    let languageId;
    try {
      languageId = await Tag.getTagId(originalLanguage, true);
    } catch (e) {
      languageId = (await Tag.createTag(originalLanguage, true)).tagId;
    }

    // see if tag exists for domain, and if not create a tag for it
    let domainId;
    try {
      domainId = await Tag.getTagId(domain, false);
    } catch (e) {
      domainId = (await Tag.createTag(domain, false)).tagId;
    }

    const documentId = await Document.createDocument(title, authors, year, domainId, content, user, languageId);
    await Tag.attachTag(languageId, documentId);
    return { msg: "Created document!" };
  }
  @Router.get("/document")
  async getDocuments() {
    return await Document.getDocuments();
  }
  @Router.get("/document/:id")
  async getDocument(id: string) {
    return await Document.getDocument(new ObjectId(id));
  }
  @Router.delete("/document/:id")
  async deleteDocument(session: WebSessionDoc, id: string) {
    const user = WebSession.getUser(session);
    const document = await Document.getDocument(new ObjectId(id));
    if (!user.equals(document.uploader)) {
      throw new Error("You did not upload this document!");
    }
    await Tag.deleteTagAttachment(document.originalLanguage, document._id);
    return await Document.deleteDocument(new ObjectId(id));
  }

  /////////////////////
  //     Section     //
  /////////////////////
  @Router.get("/section/:id")
  async getSection(id: ObjectId) {
    return await Section.getSection(id);
  }

  @Router.get("/section")
  async getSections() {
    return await Section.getSections();
  }

  @Router.get("/section")
  async splitIntoSections(text: string) {
    return await Section.splitIntoSections(text);
  }

  // Section Translation
  @Router.post("/sectionTranslation")
  async createSectionTranslation(session: WebSessionDoc, translation: string, section: string) {
    const user = WebSession.getUser(session);
    const sectionId = new ObjectId(section);
    await Section.checkSectionExists(sectionId);
    return await SectionTranslation.createSectionTranslation(user, translation, sectionId);
  }
}

export default getExpressRouter(new Routes());
