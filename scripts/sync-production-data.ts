import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const COUNTRIES = [
  { id: "cmkl84azs0003u6gkwgsymoxq", name: "Argentina", code: "AR" },
  { id: "cmkl84b070004u6gkag39jtlk", name: "Chile", code: "CL" },
  { id: "cmkl84azd0002u6gkoml9aboi", name: "Italy (Men)", code: "IT_M" },
  { id: "cmkl84ayx0001u6gkb1mvgri2", name: "Italy (Women)", code: "IT_F" },
  { id: "cmkl84ayd0000u6gkt1xxcvhl", name: "Peru", code: "PE" },
];

const EMPLOYEES = [
  { id: "cmkn0cyt10001sanxikucfjvn", name: "Cabrera", role: "buyer", countryId: "cmkl84azd0002u6gkoml9aboi", percentRate: 10, percentageBase: "spend" },
  { id: "cmkn0eeuz00000enxq4z8vmlv", name: "Corie", role: "buyer", countryId: "cmkl84ayd0000u6gkt1xxcvhl", percentRate: 10, percentageBase: "spend" },
];

const BUYER_METRICS_DATA = [
  { id: "cmkn2zg7k00000lnxz21h4rho", date: "2026-01-01", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 0, subscriptions: 0, dialogs: 5, fdCount: 1, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg7s00010lnxoop098ce", date: "2026-01-02", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 0, subscriptions: 1, dialogs: 3, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg7z00020lnxqvd41bzp", date: "2026-01-03", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 316.94, subscriptions: 375, dialogs: 150, fdCount: 5, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg8600030lnx6jroeek6", date: "2026-01-04", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 226.45, subscriptions: 267, dialogs: 113, fdCount: 3, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg8f00040lnxecquzlyw", date: "2026-01-05", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 298.63, subscriptions: 394, dialogs: 189, fdCount: 6, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg8l00050lnxht5qhflx", date: "2026-01-06", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 327.17, subscriptions: 380, dialogs: 185, fdCount: 6, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg8r00060lnx8qbjyzqt", date: "2026-01-07", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 287.86, subscriptions: 300, dialogs: 135, fdCount: 7, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg8w00070lnx7pi8i3nn", date: "2026-01-08", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 406.68, subscriptions: 351, dialogs: 183, fdCount: 5, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg9300080lnxvhou0ajn", date: "2026-01-09", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 303.81, subscriptions: 271, dialogs: 141, fdCount: 11, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg9800090lnxowhz1izl", date: "2026-01-10", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 401.69, subscriptions: 288, dialogs: 276, fdCount: 6, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg9d000a0lnxawlpgy4l", date: "2026-01-11", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 287.08, subscriptions: 262, dialogs: 135, fdCount: 8, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg9k000b0lnxq20dj40f", date: "2026-01-12", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 334.82, subscriptions: 310, dialogs: 137, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zg9p000c0lnxqpy4qz31", date: "2026-01-13", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 392.44, subscriptions: 132, dialogs: 52, fdCount: 0, deskName: "Desk3 - Corie" },
  { id: "cmkn2zga2000d0lnxk17qjrxj", date: "2026-01-14", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 295.22, subscriptions: 98, dialogs: 45, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgac000e0lnxa1ka0pov", date: "2026-01-15", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 299.06, subscriptions: 84, dialogs: 45, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgak000f0lnxkqlpadl0", date: "2026-01-16", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 324.3, subscriptions: 58, dialogs: 28, fdCount: 3, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgas000g0lnxpcgtmqwl", date: "2026-01-17", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 450.25, subscriptions: 218, dialogs: 101, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgb3000h0lnxqgyxms4w", date: "2026-01-18", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 318.76, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgbe000i0lnxiuyji5w5", date: "2026-01-19", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 308.57, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgbi000j0lnxqsl72skx", date: "2026-01-20", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84azs0003u6gkwgsymoxq", spend: 9.5, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgc0000k0lnxbzf8o0iv", date: "2026-01-01", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 0, subscriptions: 0, dialogs: 4, fdCount: 1, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgc6000l0lnx8862f796", date: "2026-01-02", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 0, subscriptions: 1, dialogs: 2, fdCount: 1, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgcf000m0lnxes66x2zs", date: "2026-01-03", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 266.35, subscriptions: 316, dialogs: 126, fdCount: 4, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgck000n0lnx1c5ydt1q", date: "2026-01-04", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 176.55, subscriptions: 208, dialogs: 88, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgcr000o0lnxen1vtjd9", date: "2026-01-05", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 191.09, subscriptions: 252, dialogs: 121, fdCount: 4, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgcx000p0lnx53fqqrmr", date: "2026-01-06", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 206.42, subscriptions: 240, dialogs: 116, fdCount: 4, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgd3000q0lnxdwx93c2k", date: "2026-01-07", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 248.44, subscriptions: 259, dialogs: 117, fdCount: 6, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgd7000r0lnxps1i9f4k", date: "2026-01-08", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 318.45, subscriptions: 275, dialogs: 143, fdCount: 4, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgdc000s0lnxg0mrjvab", date: "2026-01-09", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 251.86, subscriptions: 224, dialogs: 117, fdCount: 9, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgdi000t0lnxvtzxdtva", date: "2026-01-10", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 287.82, subscriptions: 206, dialogs: 198, fdCount: 5, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgdn000u0lnxtpabvxvq", date: "2026-01-11", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 204.32, subscriptions: 187, dialogs: 96, fdCount: 5, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgds000v0lnxi9if7g1k", date: "2026-01-12", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 237.83, subscriptions: 220, dialogs: 97, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zgdy000w0lnxs466stmi", date: "2026-01-13", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 295.36, subscriptions: 100, dialogs: 39, fdCount: 0, deskName: "Desk3 - Corie" },
  { id: "cmkn2zge2000x0lnxxk3qt4q9", date: "2026-01-14", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 276.04, subscriptions: 92, dialogs: 42, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zge7000y0lnxjxzmcz3r", date: "2026-01-15", employeeId: "cmkn0eeuz00000enxq4z8vmlv", countryId: "cmkl84b070004u6gkag39jtlk", spend: 265.25, subscriptions: 74, dialogs: 40, fdCount: 2, deskName: "Desk3 - Corie" },
  { id: "cmkn2zwn300002nnx1k6nl93d", date: "2025-11-01", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 268.72, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwnx00012nnxjrv4bhwl", date: "2025-11-02", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 301.17, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwo900022nnxj3i2nqf6", date: "2025-11-03", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 336.86, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwoh00032nnxgz9ecj2a", date: "2025-11-04", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 309.16, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwoo00042nnxnq3138ds", date: "2025-11-05", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 303.88, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwp600052nnx01wjr45a", date: "2025-11-06", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 209.89, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwpg00062nnxucx9hs0g", date: "2025-11-09", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 234.8, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwpq00072nnxq9v8rg37", date: "2025-11-10", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 227.88, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwq100082nnxxxb7u2qh", date: "2025-11-11", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 199.69, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwrt00092nnxc67yn58e", date: "2025-11-12", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 301.54, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zws4000a2nnxzrku3elv", date: "2025-11-13", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 315.11, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwsd000b2nnxi4p26lhb", date: "2025-11-14", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 323.84, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwsz000c2nnxr5bswl3r", date: "2025-11-15", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 424.01, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwtb000d2nnxdk0uw105", date: "2025-11-16", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 317.41, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmkn2zwtn000e2nnxccqibopq", date: "2025-11-17", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 370.59, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera (итальянец)" },
  { id: "cmknmlb0e0000zhlr18b2kqmh", date: "2026-01-01", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 0, subscriptions: 0, dialogs: 1, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb1o0001zhlr99u381yw", date: "2026-01-02", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 0, subscriptions: 0, dialogs: 1, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb240002zhlryjpe0jkz", date: "2026-01-03", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 0, subscriptions: 2, dialogs: 0, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb2l0003zhlre9n82gr3", date: "2026-01-04", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 83.13, subscriptions: 38, dialogs: 23, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb2x0004zhlrz61yzvhw", date: "2026-01-05", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 96.18, subscriptions: 37, dialogs: 23, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb3a0005zhlrmfdxi9m5", date: "2026-01-06", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 169.96, subscriptions: 21, dialogs: 9, fdCount: 2, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb3q0006zhlrgxmw1o9x", date: "2026-01-07", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 213.38, subscriptions: 70, dialogs: 41, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb400007zhlrp8uxmxwz", date: "2026-01-08", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 126.47, subscriptions: 33, dialogs: 16, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb4a0008zhlrbpmr3e1w", date: "2026-01-09", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 240.58, subscriptions: 26, dialogs: 13, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb4g0009zhlre2xgcc9s", date: "2026-01-10", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 358.95, subscriptions: 107, dialogs: 48, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb4s000azhlrze4t6fi3", date: "2026-01-11", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 83.6, subscriptions: 13, dialogs: 10, fdCount: 2, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb52000bzhlrudh4jwzy", date: "2026-01-12", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 70.89, subscriptions: 6, dialogs: 7, fdCount: 2, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb5c000czhlr4su88pt1", date: "2026-01-13", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 232.46, subscriptions: 37, dialogs: 26, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb5u000dzhlrijw1tyga", date: "2026-01-14", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 81.42, subscriptions: 9, dialogs: 7, fdCount: 1, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb6a000ezhlr7hiek7cr", date: "2026-01-15", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 152.08, subscriptions: 21, dialogs: 14, fdCount: 2, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb6i000fzhlrcejykmvb", date: "2026-01-16", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 204.26, subscriptions: 48, dialogs: 22, fdCount: 3, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb70000gzhlrbyb3768x", date: "2026-01-17", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 202.42, subscriptions: 44, dialogs: 26, fdCount: 2, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb79000hzhlri6f37p5u", date: "2026-01-18", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 142.76, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb7e000izhlrd44z87le", date: "2026-01-19", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 113.42, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb7l000jzhlry81xqh36", date: "2026-01-20", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 80.52, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
  { id: "cmknmlb80000kzhlr25dr9azr", date: "2026-01-21", employeeId: "cmkn0cyt10001sanxikucfjvn", countryId: "cmkl84azd0002u6gkoml9aboi", spend: 0, subscriptions: 0, dialogs: 0, fdCount: 0, deskName: "Cabrera", platformName: "Crossgif" },
];

async function syncData() {
  console.log("[Sync] Checking production database...");
  
  try {
    const existingCountries = await prisma.country.count();
    console.log(`[Sync] Found ${existingCountries} countries in production`);
    
    if (existingCountries < COUNTRIES.length) {
      console.log("[Sync] Syncing countries...");
      for (const country of COUNTRIES) {
        await prisma.country.upsert({
          where: { id: country.id },
          update: { name: country.name, code: country.code },
          create: country,
        });
      }
      console.log(`[Sync] Synced ${COUNTRIES.length} countries`);
    }

    const existingEmployees = await prisma.employee.count();
    console.log(`[Sync] Found ${existingEmployees} employees in production`);
    
    if (existingEmployees < EMPLOYEES.length) {
      console.log("[Sync] Syncing employees...");
      for (const emp of EMPLOYEES) {
        await prisma.employee.upsert({
          where: { id: emp.id },
          update: { name: emp.name, role: emp.role, countryId: emp.countryId, percentRate: emp.percentRate, percentageBase: emp.percentageBase },
          create: emp,
        });
      }
      console.log(`[Sync] Synced ${EMPLOYEES.length} employees`);
    }

    const existingMetrics = await prisma.buyerMetrics.count();
    console.log(`[Sync] Found ${existingMetrics} buyer metrics in production`);
    
    if (existingMetrics < BUYER_METRICS_DATA.length) {
      console.log(`[Sync] Syncing ${BUYER_METRICS_DATA.length} buyer metrics...`);
      let synced = 0;
      for (const metric of BUYER_METRICS_DATA) {
        const spend = metric.spend || 0;
        const subscriptions = metric.subscriptions || 0;
        const fdCount = metric.fdCount || 0;
        const dialogs = metric.dialogs || 0;
        
        const costPerSubscription = subscriptions > 0 ? spend / subscriptions : 0;
        const costPerFd = fdCount > 0 ? spend / fdCount : 0;
        const conversionRate = subscriptions > 0 ? (dialogs / subscriptions) * 100 : 0;
        const payrollAmount = spend * 0.10;

        try {
          await prisma.buyerMetrics.upsert({
            where: { id: metric.id },
            update: {},
            create: {
              id: metric.id,
              date: new Date(metric.date),
              employeeId: metric.employeeId,
              countryId: metric.countryId,
              spend,
              subscriptions,
              dialogs,
              fdCount,
              costPerSubscription,
              costPerFd,
              conversionRate,
              payrollAmount,
              deskName: metric.deskName,
              platformName: metric.platformName || null,
            },
          });
          synced++;
        } catch (e) {
          // Record already exists, skip
        }
      }
      console.log(`[Sync] Synced ${synced} buyer metrics`);
    } else {
      console.log("[Sync] Production data looks complete!");
    }

    const finalCount = await prisma.buyerMetrics.count();
    console.log(`[Sync] Final buyer metrics count: ${finalCount}`);

    // Clean SMM data
    console.log("[Sync] Cleaning SMM data...");
    const deletedSmmMetrics = await prisma.smmMetrics.deleteMany({});
    const deletedSmmProjectMetrics = await prisma.smmProjectMetrics.deleteMany({});
    console.log(`[Sync] Deleted ${deletedSmmMetrics.count} SMM metrics and ${deletedSmmProjectMetrics.count} SMM project metrics`);

  } catch (error) {
    console.error("[Sync] Error:", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

syncData();
