import { PrismaClient, Prisma } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const image = (url: string, altText: string, sortOrder: number) => ({
  url,
  altText,
  width: 1600,
  height: 1067,
  sortOrder
});

const cars = [
  {
    brand: "BMW",
    model: "530e M Sport",
    year: 2022,
    mileage: 18400,
    transmission: "AUTOMATIC",
    fuelType: "HYBRID",
    engine: "2.0L TwinPower Turbo Plug-in Hybrid",
    price: 43800,
    condition: "Certified excellent",
    status: "AVAILABLE",
    description:
      "A refined executive sedan with a documented service history, original paintwork, and a clean inspection report. The plug-in hybrid powertrain delivers quiet city driving and confident motorway performance, while the M Sport trim adds a sharper stance and a more focused cabin.",
    features: [
      "M Sport exterior package",
      "Adaptive LED headlights",
      "Harman Kardon audio",
      "Head-up display",
      "360-degree camera",
      "Wireless Apple CarPlay",
      "Heated leather seats",
      "Adaptive cruise control"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=82",
        "BMW 5 Series front three-quarter view",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1523983302122-73e869e1f850?auto=format&fit=crop&w=1600&q=82",
        "BMW sedan parked in modern setting",
        1
      )
    ]
  },
  {
    brand: "Mercedes-Benz",
    model: "C300 AMG Line",
    year: 2021,
    mileage: 23150,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "2.0L Turbocharged Inline-4",
    price: 39750,
    condition: "Excellent",
    status: "AVAILABLE",
    description:
      "A beautifully kept C-Class with AMG Line styling, a premium cabin, and strong service documentation. It balances daily comfort with responsive performance and includes the driver assistance features buyers expect from a modern Mercedes-Benz sedan.",
    features: [
      "AMG Line body styling",
      "Panoramic sunroof",
      "Burmester surround sound",
      "Blind spot assist",
      "Memory front seats",
      "Ambient cabin lighting",
      "Navigation package",
      "Keyless entry"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=82",
        "Mercedes-Benz C-Class exterior",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1614200187524-dc4b892acf16?auto=format&fit=crop&w=1600&q=82",
        "Mercedes-Benz cabin detail",
        1
      )
    ]
  },
  {
    brand: "Audi",
    model: "Q5 Quattro",
    year: 2020,
    mileage: 35200,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "2.0L TFSI Quattro",
    price: 34900,
    condition: "Very good",
    status: "RESERVED",
    description:
      "A versatile premium SUV with Quattro all-wheel drive, clean ownership records, and a careful reconditioning report. The cabin is quiet and practical, making this Q5 a strong choice for families who still want a polished driving experience.",
    features: [
      "Quattro all-wheel drive",
      "Virtual cockpit",
      "Power tailgate",
      "Tri-zone climate control",
      "Parking sensors",
      "Leather upholstery",
      "Roof rails",
      "Lane departure warning"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=82",
        "Audi SUV front view",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=82",
        "Premium SUV detail",
        1
      )
    ]
  },
  {
    brand: "Tesla",
    model: "Model 3 Long Range",
    year: 2022,
    mileage: 26800,
    transmission: "AUTOMATIC",
    fuelType: "ELECTRIC",
    engine: "Dual Motor Electric",
    price: 36950,
    condition: "Excellent",
    status: "AVAILABLE",
    description:
      "A dual-motor Model 3 with strong battery health, a clean title, and excellent tyres. It offers instant electric performance, a minimalist cabin, and long-distance usability thanks to the Long Range battery pack and Tesla charging network access.",
    features: [
      "Dual motor all-wheel drive",
      "Long Range battery",
      "Glass roof",
      "Premium audio",
      "Autopilot convenience features",
      "Heated front and rear seats",
      "Wireless phone charging",
      "Over-the-air updates"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=82",
        "Tesla Model 3 front view",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1561580125-028ee3bd62eb?auto=format&fit=crop&w=1600&q=82",
        "Tesla electric vehicle side profile",
        1
      )
    ]
  },
  {
    brand: "Toyota",
    model: "Camry Hybrid XLE",
    year: 2021,
    mileage: 30900,
    transmission: "AUTOMATIC",
    fuelType: "HYBRID",
    engine: "2.5L Hybrid",
    price: 28600,
    condition: "Excellent",
    status: "AVAILABLE",
    description:
      "A fuel-efficient Camry Hybrid with low running costs, excellent reliability credentials, and a clean maintenance record. The XLE trim brings added comfort, safety technology, and a cabin that feels a step above the typical commuter sedan.",
    features: [
      "Toyota Safety Sense",
      "Leather-trimmed seats",
      "JBL audio",
      "Adaptive cruise control",
      "Wireless charging",
      "Blind spot monitor",
      "Dual-zone climate control",
      "Power driver seat"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=1600&q=82",
        "Toyota sedan on road",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1600&q=82",
        "Sedan exterior detail",
        1
      )
    ]
  },
  {
    brand: "Porsche",
    model: "Macan S",
    year: 2019,
    mileage: 41200,
    transmission: "AUTOMATIC",
    fuelType: "PETROL",
    engine: "3.0L Turbocharged V6",
    price: 46800,
    condition: "Very good",
    status: "SOLD",
    description:
      "A driver-focused compact luxury SUV with the character expected from Porsche. This Macan S has been inspected, serviced, and prepared with care, offering a strong V6, sharp handling, and a high-quality cabin with everyday practicality.",
    features: [
      "Sport Chrono package",
      "PASM adaptive suspension",
      "Bose audio",
      "Sport exhaust",
      "20-inch alloy wheels",
      "Navigation module",
      "Power tailgate",
      "Front and rear parking sensors"
    ],
    images: [
      image(
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=82",
        "Porsche SUV parked at dusk",
        0
      ),
      image(
        "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=1600&q=82",
        "Performance vehicle detail",
        1
      )
    ]
  }
] as const;

async function main() {
  const defaultAdminEmail = "admin@prestigemotors.local";
  const defaultAdminPassword = "ChangeThisAdminPassword!2026";
  const configuredAdminEmail = process.env.ADMIN_EMAIL?.trim();
  const configuredAdminPassword = process.env.ADMIN_PASSWORD;

  if (
    process.env.NODE_ENV === "production" &&
    (!configuredAdminEmail ||
      !configuredAdminPassword ||
      configuredAdminPassword === defaultAdminPassword ||
      configuredAdminPassword.length < 16)
  ) {
    throw new Error(
      "Production seeding requires ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 16 characters."
    );
  }

  const adminEmail = (configuredAdminEmail ?? defaultAdminEmail).toLowerCase();
  const adminPassword = configuredAdminPassword ?? defaultAdminPassword;
  const passwordHash = await hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Prestige Motors Admin",
      passwordHash,
      role: "ADMIN"
    },
    create: {
      name: "Prestige Motors Admin",
      email: adminEmail,
      passwordHash,
      role: "ADMIN"
    }
  });

  const existingCars = await prisma.car.count();

  if (existingCars === 0) {
    for (const car of cars) {
      const slug = slugify(`${car.year} ${car.brand} ${car.model}`);

      await prisma.car.create({
        data: {
          slug,
          brand: car.brand,
          model: car.model,
          year: car.year,
          mileage: car.mileage,
          transmission: car.transmission,
          fuelType: car.fuelType,
          engine: car.engine,
          price: new Prisma.Decimal(car.price),
          condition: car.condition,
          description: car.description,
          features: [...car.features],
          status: car.status,
          images: {
            create: car.images.map((item) => ({ ...item }))
          }
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
