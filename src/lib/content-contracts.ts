import fs from "fs";
import path from "path";

import { z } from "zod";

export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ContentContractInput {
  filePath: string;
  frontmatter: unknown;
  body: string;
}

export interface ContentValidationError {
  filePath: string;
  field: string;
  reason: string;
}

export interface ValidatedContentEntry<TFrontmatter> {
  filePath: string;
  frontmatter: TFrontmatter;
  body: string;
}

export type ContentContractResult<TFrontmatter> =
  | {
      success: true;
      entry: ValidatedContentEntry<TFrontmatter>;
      errors: [];
    }
  | {
      success: false;
      entry: null;
      errors: ContentValidationError[];
    };

export interface ContentContractBatchResult<TFrontmatter> {
  entries: ValidatedContentEntry<TFrontmatter>[];
  errors: ContentValidationError[];
}

export interface ProjectContractOptions {
  publicDir: string;
}

const DEFAULT_PROJECT_CONTRACT_OPTIONS: ProjectContractOptions = {
  publicDir: path.join(process.cwd(), "public"),
};

const nonBlankTextSchema = z.string().trim().min(1, "Must not be blank.");

const calendarDateSchema = z.string().superRefine((value, context) => {
  if (!isRealCalendarDate(value)) {
    context.addIssue({
      code: "custom",
      message: "Must be a real YYYY-MM-DD calendar date.",
    });
  }
});

const slugSchema = z
  .string()
  .regex(
    CONTENT_SLUG_PATTERN,
    'Must use lowercase kebab-case (for example, "my-post").',
  );

const tagSchema = z.string().trim().min(1, "Tags must not be blank.");

const tagsSchema = z
  .array(tagSchema)
  .min(1, "Must contain at least one tag.")
  .superRefine((tags, context) => {
    const firstIndexByTag = new Map<string, number>();

    for (const [index, tag] of tags.entries()) {
      const firstIndex = firstIndexByTag.get(tag);
      if (firstIndex === undefined) {
        firstIndexByTag.set(tag, index);
        continue;
      }

      context.addIssue({
        code: "custom",
        message: `Duplicates the tag at index ${firstIndex}.`,
        path: [index],
      });
    }
  });

const coverPathSchema = z.string().trim().min(1, "Must not be blank.");

const absoluteHttpsUrlSchema = z
  .string()
  .trim()
  .superRefine((value, context) => {
    try {
      const url = new URL(value);
      if (
        !/^https:\/\//i.test(value) ||
        url.protocol !== "https:" ||
        url.hostname.length === 0
      ) {
        throw new Error("not an absolute HTTPS URL");
      }
    } catch {
      context.addIssue({
        code: "custom",
        message: "Must be an absolute HTTPS URL.",
      });
    }
  });

function createContentStateSchemas<const TShape extends z.ZodRawShape>(
  fields: TShape,
) {
  const fieldsSchema = z.object(fields);

  return {
    draft: fieldsSchema
      .partial()
      .extend({ draft: z.literal(true) })
      .strict(),
    published: fieldsSchema.extend({ draft: z.literal(false) }).strict(),
    providedFields: fieldsSchema
      .partial()
      .extend({ draft: z.boolean().optional() })
      .strict(),
  };
}

const sharedContentFields = {
  title: nonBlankTextSchema,
  slug: slugSchema,
  date: calendarDateSchema,
  tags: tagsSchema,
};

const postFields = {
  ...sharedContentFields,
  updated: calendarDateSchema.optional(),
  summary: nonBlankTextSchema,
};

const projectFields = {
  ...sharedContentFields,
  description: nonBlankTextSchema,
  cover: coverPathSchema,
  role: nonBlankTextSchema,
  duration: nonBlankTextSchema,
  result: nonBlankTextSchema,
  source: absoluteHttpsUrlSchema.optional(),
  demo: absoluteHttpsUrlSchema.optional(),
  featured: z.boolean(),
};

const postStateSchemas = createContentStateSchemas(postFields);
const projectStateSchemas = createContentStateSchemas(projectFields);

export type DraftPostFrontmatter = z.infer<typeof postStateSchemas.draft>;
export type PublishedPostFrontmatter = z.infer<
  typeof postStateSchemas.published
>;
export type PostFrontmatter = DraftPostFrontmatter | PublishedPostFrontmatter;

export type DraftProjectCaseFrontmatter = z.infer<
  typeof projectStateSchemas.draft
>;
export type PublishedProjectCaseFrontmatter = z.infer<
  typeof projectStateSchemas.published
>;
export type ProjectCaseFrontmatter =
  | DraftProjectCaseFrontmatter
  | PublishedProjectCaseFrontmatter;

interface ContentStateSchemas<TDraftFrontmatter, TPublishedFrontmatter> {
  draft: z.ZodType<TDraftFrontmatter>;
  published: z.ZodType<TPublishedFrontmatter>;
  providedFields: z.ZodType;
}

function isRealCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return (
    month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1]!
  );
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasMarkdownBody(body: string): boolean {
  return body.trim().length > 0;
}

function zodErrors(
  error: z.ZodError,
  filePath: string,
): ContentValidationError[] {
  return error.issues.flatMap((issue) => {
    if (issue.code === "unrecognized_keys") {
      return issue.keys.map((key) => ({
        filePath,
        field: key,
        reason: "Unknown frontmatter field.",
      }));
    }

    return [
      {
        filePath,
        field:
          issue.path.length === 0
            ? "frontmatter"
            : issue.path.map(String).join("."),
        reason: issue.message,
      },
    ];
  });
}

function updatedDateErrors(
  frontmatter: Record<string, unknown>,
  filePath: string,
): ContentValidationError[] {
  const { date, updated } = frontmatter;

  if (
    typeof date === "string" &&
    typeof updated === "string" &&
    updated < date
  ) {
    return [
      {
        filePath,
        field: "updated",
        reason: "Must not be earlier than date.",
      },
    ];
  }

  return [];
}

function validateContractVariant<TFrontmatter>(
  input: ContentContractInput,
  schema: z.ZodType<TFrontmatter>,
  requiresMarkdownBody: boolean,
): ContentContractResult<TFrontmatter> {
  const parsed = schema.safeParse(input.frontmatter);
  const errors = parsed.success ? [] : zodErrors(parsed.error, input.filePath);

  if (requiresMarkdownBody && !hasMarkdownBody(input.body)) {
    errors.push({
      filePath: input.filePath,
      field: "body",
      reason: "Published content must contain a non-empty Markdown body.",
    });
  }

  if (parsed.success && isRecord(parsed.data)) {
    errors.push(...updatedDateErrors(parsed.data, input.filePath));
  }

  if (parsed.success && errors.length === 0) {
    return {
      success: true,
      entry: {
        filePath: input.filePath,
        frontmatter: parsed.data,
        body: input.body,
      },
      errors: [],
    };
  }

  return { success: false, entry: null, errors };
}

function validateUnresolvedDraftState(
  input: ContentContractInput,
  schema: z.ZodType,
): ContentContractResult<never> {
  if (!isRecord(input.frontmatter)) {
    return {
      success: false,
      entry: null,
      errors: [
        {
          filePath: input.filePath,
          field: "frontmatter",
          reason: "Frontmatter must be an object.",
        },
      ],
    };
  }

  const parsed = schema.safeParse(input.frontmatter);
  const errors = parsed.success ? [] : zodErrors(parsed.error, input.filePath);

  if (!hasOwn(input.frontmatter, "draft")) {
    errors.push({
      filePath: input.filePath,
      field: "draft",
      reason: "Must be explicitly declared as true or false.",
    });
  } else if (input.frontmatter["draft"] === undefined && parsed.success) {
    errors.push({
      filePath: input.filePath,
      field: "draft",
      reason: "Must be a boolean declared as true or false.",
    });
  }

  return { success: false, entry: null, errors };
}

function validateContentState<TDraftFrontmatter, TPublishedFrontmatter>(
  input: ContentContractInput,
  schemas: ContentStateSchemas<TDraftFrontmatter, TPublishedFrontmatter>,
): ContentContractResult<TDraftFrontmatter | TPublishedFrontmatter> {
  if (!isRecord(input.frontmatter)) {
    return validateUnresolvedDraftState(input, schemas.providedFields);
  }

  if (input.frontmatter["draft"] === true) {
    return validateContractVariant(input, schemas.draft, false);
  }

  if (input.frontmatter["draft"] === false) {
    return validateContractVariant(input, schemas.published, true);
  }

  return validateUnresolvedDraftState(input, schemas.providedFields);
}

function appendErrors<TFrontmatter>(
  result: ContentContractResult<TFrontmatter>,
  errors: ContentValidationError[],
): ContentContractResult<TFrontmatter> {
  if (errors.length === 0) {
    return result;
  }

  return {
    success: false,
    entry: null,
    errors: [...result.errors, ...errors],
  };
}

function isPathWithin(root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);

  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

function projectCoverErrors(
  input: ContentContractInput,
  options: ProjectContractOptions,
): ContentValidationError[] {
  if (
    !isRecord(input.frontmatter) ||
    typeof input.frontmatter["cover"] !== "string"
  ) {
    return [];
  }

  const cover = input.frontmatter["cover"].trim();
  if (cover.length === 0) {
    return [];
  }

  if (!cover.startsWith("/") || cover.startsWith("//")) {
    return [
      {
        filePath: input.filePath,
        field: "cover",
        reason: "Must be a root-relative path inside public/.",
      },
    ];
  }

  const publicDir = path.resolve(options.publicDir);
  const coverPath = path.resolve(publicDir, `.${cover}`);

  if (!isPathWithin(publicDir, coverPath)) {
    return [
      {
        filePath: input.filePath,
        field: "cover",
        reason: "Must resolve inside public/ without path traversal.",
      },
    ];
  }

  if (!fs.existsSync(coverPath)) {
    return [
      {
        filePath: input.filePath,
        field: "cover",
        reason: "Referenced file does not exist inside public/.",
      },
    ];
  }

  try {
    if (!fs.statSync(coverPath).isFile()) {
      return [
        {
          filePath: input.filePath,
          field: "cover",
          reason: "Must reference a file inside public/.",
        },
      ];
    }

    const realPublicDir = fs.realpathSync(publicDir);
    const realCoverPath = fs.realpathSync(coverPath);
    if (!isPathWithin(realPublicDir, realCoverPath)) {
      return [
        {
          filePath: input.filePath,
          field: "cover",
          reason:
            "Must resolve inside public/ without following a path outside it.",
        },
      ];
    }
  } catch {
    return [
      {
        filePath: input.filePath,
        field: "cover",
        reason: "Could not resolve the referenced file inside public/.",
      },
    ];
  }

  return [];
}

export function validatePostContract(
  input: ContentContractInput,
): ContentContractResult<PostFrontmatter> {
  return validateContentState(input, postStateSchemas);
}

export function validateProjectCaseContract(
  input: ContentContractInput,
  options: ProjectContractOptions = DEFAULT_PROJECT_CONTRACT_OPTIONS,
): ContentContractResult<ProjectCaseFrontmatter> {
  const result = validateContentState(input, projectStateSchemas);

  return appendErrors(result, projectCoverErrors(input, options));
}

function duplicateSlugErrors(
  inputs: readonly ContentContractInput[],
  collection: "post" | "project",
): ContentValidationError[] {
  const filePathsBySlug = new Map<string, string[]>();

  for (const input of inputs) {
    if (!isRecord(input.frontmatter)) {
      continue;
    }

    const { slug } = input.frontmatter;
    if (typeof slug !== "string" || !CONTENT_SLUG_PATTERN.test(slug)) {
      continue;
    }

    const filePaths = filePathsBySlug.get(slug) ?? [];
    filePaths.push(input.filePath);
    filePathsBySlug.set(slug, filePaths);
  }

  const errors: ContentValidationError[] = [];
  for (const [slug, filePaths] of filePathsBySlug) {
    if (filePaths.length < 2) {
      continue;
    }

    for (const filePath of filePaths) {
      const otherFilePaths = filePaths.filter(
        (candidate) => candidate !== filePath,
      );
      errors.push({
        filePath,
        field: "slug",
        reason: `Slug \"${slug}\" must be unique within the ${collection} collection; also declared in ${otherFilePaths.join(", ")}.`,
      });
    }
  }

  return errors;
}

function batchResult<TFrontmatter>(
  inputs: readonly ContentContractInput[],
  validator: (
    input: ContentContractInput,
  ) => ContentContractResult<TFrontmatter>,
  collection: "post" | "project",
): ContentContractBatchResult<TFrontmatter> {
  const entries: ValidatedContentEntry<TFrontmatter>[] = [];
  const errors: ContentValidationError[] = [];

  for (const input of inputs) {
    const result = validator(input);
    if (result.success) {
      entries.push(result.entry);
    }
    errors.push(...result.errors);
  }

  errors.push(...duplicateSlugErrors(inputs, collection));

  return { entries, errors };
}

export function validatePostContracts(
  inputs: readonly ContentContractInput[],
): ContentContractBatchResult<PostFrontmatter> {
  return batchResult(inputs, validatePostContract, "post");
}

export function validateProjectCaseContracts(
  inputs: readonly ContentContractInput[],
  options: ProjectContractOptions = DEFAULT_PROJECT_CONTRACT_OPTIONS,
): ContentContractBatchResult<ProjectCaseFrontmatter> {
  return batchResult(
    inputs,
    (input) => validateProjectCaseContract(input, options),
    "project",
  );
}
