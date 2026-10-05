import {APIError, modelRouter, OwnerQueryFilter, Permissions, z} from "@terreno/api";
import {Blocklist} from "../models/blocklist";
import {User} from "../models/user";
import type {BlocklistDocument, BlocklistSource} from "../types/models/blocklistTypes";
import type {UserDocument} from "../types/models/userTypes";
import {normalizeDomains} from "../utils/domains";

const STARTER_BLOCKLISTS: {
  domains: string[];
  key: string;
  name: string;
}[] = [
  {
    domains: ["x.com", "facebook.com", "instagram.com", "tiktok.com", "reddit.com"],
    key: "social",
    name: "Social",
  },
  {
    domains: ["news.ycombinator.com", "cnn.com", "nytimes.com", "theguardian.com"],
    key: "news",
    name: "News",
  },
  {
    domains: ["youtube.com", "netflix.com", "twitch.tv"],
    key: "video",
    name: "Video",
  },
];

const blocklistResponseSchema = z.array(
  z.object({
    _id: z.string(),
    created: z.string().or(z.date()).optional(),
    deleted: z.boolean().optional(),
    domains: z.array(z.string()),
    name: z.string(),
    ownerId: z.string(),
    source: z.enum(["starter", "user"]),
    starterKey: z.string().optional(),
    updated: z.string().or(z.date()).optional(),
  })
);

const cleanName = (value: unknown): string => {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length < 1 || name.length > 60) {
    throw new APIError({
      fields: {name: "Name must be between 1 and 60 characters"},
      status: 400,
      title: "Invalid blocklist name",
    });
  }
  return name;
};

const cleanDomains = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new APIError({
      fields: {domains: "At least one domain is required"},
      status: 400,
      title: "At least one domain is required",
    });
  }
  const {domains, invalid} = normalizeDomains(value.map(String));
  if (invalid.length > 0) {
    throw new APIError({
      fields: {domains: `Invalid domains: ${invalid.join(", ")}`},
      status: 400,
      title: "Invalid domains",
    });
  }
  if (domains.length > 200) {
    throw new APIError({
      fields: {domains: "A blocklist can contain at most 200 domains"},
      status: 400,
      title: "Too many domains",
    });
  }
  return domains;
};

const ownerIdFrom = (req: unknown): UserDocument["_id"] | undefined =>
  (req as {user?: UserDocument}).user?._id;

const userFrom = (value: unknown): UserDocument => value as UserDocument;

const listStarterBlocklists = (ownerId: UserDocument["_id"]): Promise<BlocklistDocument[]> =>
  Blocklist.find({deleted: false, ownerId, source: "starter"}).sort("created").exec();

export const blocklistRouter = modelRouter("/blocklists", Blocklist, {
  collectionActions: {
    starter: {
      handler: async ({user}) => {
        const appUser = userFrom(user);
        const ownerId = appUser._id;
        const currentUser = await User.findExactlyOne({_id: ownerId});
        if (currentUser.starterBlocklistsSeededAt) {
          return listStarterBlocklists(ownerId);
        }
        try {
          await Blocklist.insertMany(
            STARTER_BLOCKLISTS.map((preset) => ({
              domains: preset.domains,
              name: preset.name,
              ownerId,
              source: "starter" as BlocklistSource,
              starterKey: preset.key,
            })),
            {ordered: false}
          );
        } catch (error) {
          if ((error as {code?: number}).code !== 11000) {
            throw error;
          }
        }
        currentUser.starterBlocklistsSeededAt = new Date();
        await currentUser.save();
        return listStarterBlocklists(ownerId);
      },
      method: "POST",
      permissions: [Permissions.IsAuthenticated],
      response: blocklistResponseSchema,
      summary: "Seed editable starter blocklists for the signed-in user",
    },
  },
  permissions: {
    create: [Permissions.IsAuthenticated],
    delete: [Permissions.IsOwner],
    list: [Permissions.IsAuthenticated],
    read: [Permissions.IsOwner],
    update: [Permissions.IsOwner],
  },
  preCreate: (body, req) => {
    const value = (body ?? {}) as Partial<BlocklistDocument>;
    return {
      ...(value._id ? {_id: value._id} : {}),
      domains: cleanDomains(value.domains),
      name: cleanName(value.name),
      ownerId: ownerIdFrom(req),
      source: "user",
    } as BlocklistDocument;
  },
  preUpdate: (body) => {
    const value = (body ?? {}) as Partial<BlocklistDocument>;
    const update: Partial<BlocklistDocument> = {};
    if (value.name !== undefined) {
      update.name = cleanName(value.name);
    }
    if (value.domains !== undefined) {
      update.domains = cleanDomains(value.domains);
    }
    return update as BlocklistDocument;
  },
  queryFields: ["source"],
  queryFilter: OwnerQueryFilter,
  sort: "name",
  // Local-first sync (@terreno/syncdb): stream = blocklists|owner:{ownerId}.
  sync: {scope: {type: "owner"}},
  validation: {
    excludeFromCreate: ["ownerId", "source", "starterKey"],
    excludeFromUpdate: ["ownerId", "source", "starterKey"],
    validateCreate: true,
    validateQuery: true,
    validateUpdate: true,
  },
});
