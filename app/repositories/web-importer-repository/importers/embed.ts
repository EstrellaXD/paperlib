import { PaperEntity } from "@/models/paper-entity";
import { Preference } from "@/preference/preference";
import { MainRendererStateStore } from "@/state/renderer/appstate";
import { readFileSync } from "fs";

import { WebContentType, WebImporter } from "./importer";

export class EmbedWebImporter extends WebImporter {
  constructor(stateStore: MainRendererStateStore, preference: Preference) {
    const urlRegExp = new RegExp("^https?://");
    super(stateStore, preference, urlRegExp);
  }

  async parsingProcess(
    webContent: WebContentType
  ): Promise<PaperEntity | boolean> {
    var el = document.createElement("html");
    el.innerHTML = webContent.document;

    // Get meta tags
    const metaTags = el.getElementsByTagName("meta");
    let entityDraft: PaperEntity | boolean = false;
    if (metaTags.length > 0) {
      entityDraft = new PaperEntity(true);
      let matched = false;

      const authors = [];

      // @ts-ignore
      for (const meta of metaTags) {
        if (meta.name === "citation_title" || meta.name === "dc.Title") {
          entityDraft.setValue("title", meta.content);
          matched = true;
        }
        if (meta.name === "citation_author" || meta.name === "dc.Creator") {
          authors.push(meta.content);
        }
        if (meta.name === "citation_publication_date" || meta.name == "dc.Date") {
          entityDraft.setValue("pubTime", meta.content.split("/")[0]);
        }
        if (meta.name === "citation_doi" || meta.name === "dc.Identifier") {
          entityDraft.setValue("doi", meta.content);
        }
        if (meta.name === "citation_pdf_url" || meta.name === "dc.Identifier") {
          let downloadURL;
          if (webContent.url.includes('adsabs.harvard.edu')) {
            downloadURL = `https://ui.adsabs.harvard.edu${meta.content}`;
          } else {
            if (meta.content.endsWith(".pdf")) {
              downloadURL = meta.content;
            } else {
              downloadURL = meta.content + ".pdf";
            }
          }

          const downloadedFilePath = await window.networkTool.downloadPDFs([
            downloadURL,
          ]);
          if (downloadedFilePath.length > 0) {

            const fileContent = readFileSync(downloadedFilePath[0]);
            if (fileContent.subarray(0, 5).toString() === '%PDF-' && fileContent.subarray(-5).toString().includes('EOF')) {
              entityDraft.setValue("mainURL", downloadedFilePath[0]);
            }
          }
        }
      }
      if (authors.length > 0) {
        entityDraft.setValue(
          "authors",
          authors
            .map((author) => {
              return author.trim();
            })
            .join(", ")
        );
      }
      if (!matched) {
        entityDraft = false;
      }
    }

    return entityDraft;
  }
}
