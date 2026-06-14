import React, { useMemo } from 'react';
import type { Invitation } from '../../types/Invitation.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/useDateFormat';
import CheckIcon from '@mui/icons-material/Check';

type ReceivedInvitationsListProps = {
  invitations: Invitation[];
  processingInvitation: boolean;
  onAcceptInvitation: (invitation: Invitation) => void;
  onDeleteInvitation: (invitation: Invitation) => void;
};

export const ReceivedInvitationsList: React.FC<
  ReceivedInvitationsListProps
> = ({
  invitations,
  processingInvitation,
  onAcceptInvitation,
  onDeleteInvitation,
}) => {
  const { format_date } = useDateFormat();

  const data = useMemo(
    () =>
      invitations.map((invitation) => ({
        id: invitation.id,
        'Scoreboard Name': invitation.scoreboardName,
        From: invitation.createdByName,
        Received: format_date(invitation.created),
        invitation,
      })),
    [invitations]
  );

  return (
    <DataTable
      title={'Scoreboard Invitations'}
      headers={['Scoreboard Name', 'From', 'Received']}
      data={data}
      showBadge
      permissions={['Delete']}
      disableDelete={processingInvitation}
      pageSize={10}
      onDelete={(row) => onDeleteInvitation(row.invitation)}
      onCustom={(row) => onAcceptInvitation(row.invitation)}
      onCustomIcon={<CheckIcon />}
    />
  );
};
