import React, { useMemo } from 'react';
import type { Invitation } from '../../types/Invitation.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/Utils.ts';
import CheckIcon from '@mui/icons-material/Check';

type ReceivedInvitationsListProps = {
  invitations: Invitation[];
  processingInvitation: boolean;
  onAcceptInvitation: (invitation: Invitation) => void;
  onDeleteInvitation: (invitation: Invitation) => void;
  isLoading: boolean;
};

export const ReceivedInvitationsList: React.FC<
  ReceivedInvitationsListProps
> = ({
  invitations,
  processingInvitation,
  onAcceptInvitation,
  onDeleteInvitation,
  isLoading,
}) => {
  const { format_date } = useDateFormat();

  const data = useMemo(
    () =>
      invitations.map((invitation) => ({
        id: invitation.id,
        Scoreboard: invitation.scoreboardName,
        From: invitation.inviterName,
        Received: format_date(invitation.created),
        invitation,
      })),
    [invitations]
  );

  return (
    <DataTable
      title={'Scoreboard Invitations'}
      headers={['Scoreboard', 'From', 'Received']}
      data={data}
      showHighlight={invitations.length > 0}
      pageSize={10}
      onDelete={(row) => onDeleteInvitation(row.invitation)}
      canDelete={!processingInvitation}
      onCustom={(row) => onAcceptInvitation(row.invitation)}
      canCustom
      onCustomIcon={<CheckIcon />}
      customTooltip={'Accept'}
      isLoading={isLoading}
    />
  );
};
