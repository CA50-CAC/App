import { describe, expect, it } from "vitest";
import { looksLikeSchoolEmail } from "./school-email";

describe("looksLikeSchoolEmail", () => {
  it.each(["a@lincoln.edu", "a@cusd.k12.ca.us", "a@district.k12.ca.us", "a@lausd.net", "a@springfieldschool.org", "a@mvusd.org", "a@stmarysacademy.org"])(
    "%s looks like a school",
    (e) => expect(looksLikeSchoolEmail(e)).toBe(true),
  );
  it.each(["a@gmail.com", "a@outlook.com", "a@acme.com", "not-an-email"])("%s doesn't", (e) =>
    expect(looksLikeSchoolEmail(e)).toBe(false),
  );
});
