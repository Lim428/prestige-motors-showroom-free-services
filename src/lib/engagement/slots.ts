import type { AppointmentStatus } from "@prisma/client";
import { HttpError } from "@/lib/errors";

export const SHOWROOM_TIMEZONE = "Asia/Kuala_Lumpur";
export const SLOT_MINUTES = 60;
export const OPENING_HOUR = 10;
export const CLOSING_HOUR = 18;
export const SLOT_CAPACITY = 4;

type ExistingAppointment = {
  carId: string | null;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
};

export type AppointmentSlot = {
  time: string;
  startAt: string;
  endAt: string;
  available: boolean;
};

export function malaysiaDateTime(date: string, time: string) {
  const value = new Date(`${date}T${time}:00+08:00`);

  if (Number.isNaN(value.getTime())) {
    throw new HttpError(422, "Invalid appointment date or time.");
  }

  return value;
}

export function dayBounds(date: string) {
  return {
    start: malaysiaDateTime(date, "00:00"),
    end: malaysiaDateTime(date, "23:59")
  };
}

export function appointmentRange(date: string, time: string) {
  const [hour, minute] = time.split(":").map(Number);

  if (minute !== 0 || hour < OPENING_HOUR || hour >= CLOSING_HOUR) {
    throw new HttpError(
      422,
      `Appointments are available hourly from ${OPENING_HOUR}:00 to ${CLOSING_HOUR}:00.`
    );
  }

  const startAt = malaysiaDateTime(date, time);
  const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60_000);

  if (startAt.getTime() <= Date.now()) {
    throw new HttpError(422, "Choose a future appointment time.");
  }

  return { startAt, endAt };
}

function overlaps(
  appointment: Pick<ExistingAppointment, "startAt" | "endAt">,
  startAt: Date,
  endAt: Date
) {
  return appointment.startAt < endAt && appointment.endAt > startAt;
}

export function slotIsAvailable(
  appointments: ExistingAppointment[],
  startAt: Date,
  endAt: Date,
  carId?: string
) {
  const active = appointments.filter(
    (appointment) =>
      appointment.status !== "CANCELLED" &&
      appointment.status !== "NO_SHOW" &&
      overlaps(appointment, startAt, endAt)
  );

  if (active.length >= SLOT_CAPACITY) {
    return false;
  }

  return !carId || !active.some((appointment) => appointment.carId === carId);
}

export function buildSlots(
  date: string,
  appointments: ExistingAppointment[],
  carId?: string
): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];

  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour += 1) {
    const time = `${hour.toString().padStart(2, "0")}:00`;
    const startAt = malaysiaDateTime(date, time);
    const endAt = new Date(startAt.getTime() + SLOT_MINUTES * 60_000);

    slots.push({
      time,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      available:
        startAt.getTime() > Date.now() &&
        slotIsAvailable(appointments, startAt, endAt, carId)
    });
  }

  return slots;
}
