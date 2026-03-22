let shouldResetOrganizationsState = false;

export function resetOrganizationsState() {
  shouldResetOrganizationsState = true;
}

export function consumeOrganizationsStateReset(): boolean {
  if (!shouldResetOrganizationsState) {
    return false;
  }

  shouldResetOrganizationsState = false;
  return true;
}
