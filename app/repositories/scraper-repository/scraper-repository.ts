import got from "got";

import { PaperEntity } from "@/models/paper-entity";
import { Preference, ScraperPreference } from "@/preference/preference";
import { MainRendererStateStore } from "@/state/renderer/appstate";

import { ArXivScraper } from "./scrapers/arxiv";
import { CrossRefScraper } from "./scrapers/crossref";
import { CustomScraper } from "./scrapers/custom";
import {
  DBLPScraper,
  DBLPVenueScraper,
  DBLPbyTimeScraper,
} from "./scrapers/dblp";
import { DOIScraper } from "./scrapers/doi";
import { GoogleScholarScraper } from "./scrapers/google-scholar";
import { IEEEScraper } from "./scrapers/ieee";
import { OpenreviewScraper } from "./scrapers/openreview";
import { PaperlibScraper } from "./scrapers/paperlib";
import { PwCScraper } from "./scrapers/paperwithcode";
import { PDFScraper } from "./scrapers/pdf";
import { ScraperType } from "./scrapers/scraper";

export class ScraperRepository {
  stateStore: MainRendererStateStore;
  preference: Preference;

  scraperList: Array<{ name: string; scraper: ScraperType }>;

  constructor(stateStore: MainRendererStateStore, preference: Preference) {
    this.stateStore = stateStore;
    this.preference = preference;

    this.scraperList = [];

    this.createScrapers();

    void got("https://paperlib.app/api/version");
  }

  async createScrapers() {
    this.scraperList = [];

    const scraperPrefs = (
      this.preference.get("scrapers") as Array<ScraperPreference>
    ).sort((a, b) => b.priority - a.priority);

    for (const scraper of scraperPrefs) {
      if (scraper.name === "dblp") {
        const dblpScraper = new DBLPScraper(this.stateStore, this.preference);
        const dblpByTimeScraper0 = new DBLPbyTimeScraper(
          this.stateStore,
          this.preference,
          0
        );
        const dblpbyTimeScraper1 = new DBLPbyTimeScraper(
          this.stateStore,
          this.preference,
          1
        );
        const dblpVenueScraper = new DBLPVenueScraper(
          this.stateStore,
          this.preference
        );
        this.scraperList.push({
          name: "dblp",
          scraper: dblpScraper,
        });
        this.scraperList.push({
          name: "dblp-by-time-0",
          scraper: dblpByTimeScraper0,
        });
        this.scraperList.push({
          name: "dblp-by-time-1",
          scraper: dblpbyTimeScraper1,
        });
        this.scraperList.push({
          name: "dblp-venue",
          scraper: dblpVenueScraper,
        });
      } else {
        let scraperInstance: ScraperType | undefined;
        switch (scraper.name) {
          case "pdf":
            scraperInstance = new PDFScraper(this.stateStore, this.preference);
            break;
          case "crossref":
            scraperInstance = new CrossRefScraper(
              this.stateStore,
              this.preference
            );
            break;
          case "doi":
            scraperInstance = new DOIScraper(this.stateStore, this.preference);
            break;
          case "arxiv":
            scraperInstance = new ArXivScraper(
              this.stateStore,
              this.preference
            );
            break;
          case "ieee":
            scraperInstance = new IEEEScraper(this.stateStore, this.preference);
            break;
          case "paperlib":
            scraperInstance = new PaperlibScraper(
              this.stateStore,
              this.preference
            );
            break;
          case "pwc":
            scraperInstance = new PwCScraper(this.stateStore, this.preference);
            break;
          case "openreview":
            scraperInstance = new OpenreviewScraper(
              this.stateStore,
              this.preference
            );
            break;
          case "googlescholar":
            scraperInstance = new GoogleScholarScraper(
              this.stateStore,
              this.preference
            );
            break;
          default:
            scraperInstance = new CustomScraper(
              this.stateStore,
              this.preference,
              scraper.name
            );
        }
        if (scraperInstance !== undefined) {
          this.scraperList.push({
            name: scraper.name,
            scraper: scraperInstance,
          });
        }
      }
    }
  }

  async scrape(
    paperEntityDraft: PaperEntity,
    excludes: string[] = []
  ): Promise<PaperEntity> {
    for (const scraper of this.scraperList) {
      if (excludes.includes(scraper.name)) {
        continue;
      }
      try {
        paperEntityDraft = await scraper.scraper.scrape(paperEntityDraft);
      } catch (error) {
        console.error(error);
        this.stateStore.logState.alertLog = `${scraper.name} error: ${
          error as string
        }`;
      }
    }
    return paperEntityDraft;
  }

  async scrapeFrom(
    paperEntityDraft: PaperEntity,
    scraperName: string
  ): Promise<PaperEntity> {
    for (const scraper of this.scraperList) {
      if (scraper.name === scraperName) {
        try {
          paperEntityDraft = await scraper.scraper.scrape(paperEntityDraft);
        } catch (error) {
          console.error(error);
          this.stateStore.logState.alertLog = `${scraper.name} error: ${
            error as string
          }`;
        }
      }
    }
    return paperEntityDraft;
  }
}