import React, { useState, Fragment } from "react";
import { BoxProps, FormControl, FormHelperText, InputAdornment, InputBase, Box, Typography } from "@material-ui/core";
import { makeStyles, withStyles } from "@material-ui/core/styles";
import cls from "classnames"
import { AppTheme } from "app/theme/types";

interface Props extends BoxProps {
  label?: React.ReactNode;
  value: string | string[];
  onValueChange: (value: string) => void;
  multiline?: boolean;
  error?: string;
  instruction?: string;
  startAdornment?: JSX.Element;
  endAdornment?: JSX.Element;
  inline?: boolean;
  wordLimit?: number;
  hideInput?: boolean;
  type?: string;
  onInputBlur?: () => void;
}

const BootstrapInput = withStyles(theme => ({
  root: {
    borderRadius: 12,
    backgroundColor: theme.palette.type === "dark" ? "#0D1B24" : "#DEFFFF",
    border: (theme as unknown as AppTheme).palette.border,
    'label + &': {
      marginTop: theme.spacing(3.5),
    },
    '&:focus': {
      borderColor: theme.palette.action.selected,
    },
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    padding: '5px 12px',
    "& input": {
      // remove number spinner
      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
        "-webkit-appearance": "none",
      },
    },
  },
  input: {
    position: 'relative',
    fontSize: 12,
    width: '100%',
  },
}))(InputBase);

const ArkInput: React.FC<Props> = (props: Props) => {
  const { hideInput, wordLimit, inline, startAdornment, endAdornment, instruction, error = "", label, multiline, value, onValueChange, onInputBlur, className, type, ...rest } = props;
  const classes = useStyles();
  const [onFocus, setOnFocus] = useState(false)

  const onBlur = () => {
    if (onInputBlur) {
      onInputBlur();
    }
    setOnFocus(false);
  }

  return (
    <Box className={cls(classes.root, className)}>
      {inline && (<Typography className={cls(classes.label, 'inline')}>
        {label}
      </Typography>)}
      <FormControl fullWidth className={cls({ [classes.inline]: inline })}>
        {!inline && (
          <Fragment>
            {typeof label === "string" ? (<Typography className={classes.label}>{label}</Typography>) : label}
            {instruction && (
              <FormHelperText className={cls(classes.instruction)}>{instruction}
                {wordLimit && (<Typography className={cls(classes.wordLimit)}> {value.length || "0"}/{wordLimit}</Typography>)}
              </FormHelperText>
            )}
          </Fragment>
        )}
        {!hideInput && (
          <BootstrapInput
            type={type ?? "string"}
            startAdornment={startAdornment ? <InputAdornment className={cls({ [classes.focusAdornment]: onFocus && !error })} position="start">{startAdornment}</InputAdornment> : undefined}
            endAdornment={endAdornment ? <InputAdornment className={cls({ [classes.focusAdornment]: onFocus && !error })} position="end">{endAdornment}</InputAdornment> : undefined}
            onFocus={() => setOnFocus(true)} onBlur={onBlur} className={cls({ [classes.focused]: onFocus && !error, [classes.multiline]: multiline, [classes.error]: error && !!value })}
            multiline={multiline} value={value} onChange={(e) => onValueChange(e.target.value)} fullWidth defaultValue="react-bootstrap" {...rest} />
        )}
        <FormHelperText className={cls({ [classes.errorText]: true })} >{error ? error : " "}</FormHelperText>
      </FormControl>
    </Box >
  );
};

const useStyles = makeStyles((theme: AppTheme) => ({
  root: {
    marginTop: theme.spacing(1),
    width: "100%",
    display: "flex",
    alignItems: "center"
  },
  label: {
    fontSize: 13,
    color: theme.palette.type === "dark" ? "#DEFFFF" : "#0D1B24",
    fontFamily: "'Raleway', sans-serif",
    fontWeight: 800,
    overflowX: "visible",
    '&.inline': {
      width: 100,
      paddingBottom: theme.spacing(1.5),
    }
  },
  error: {
    border: '1px solid #FF5252',
    color: "#FF5252",
    '&:focus': {
      borderColor: "#FF5252",
      color: "#FF5252",
    },
  },
  errorText: {
    color: "#FF5252",
    fontSize: 10,
    margin: 0
  },
  instruction: {
    color: theme.palette.type === "dark" ? "#DEFFFF99" : "#00334099",
    fontFamily: 'Avenir Next',
    fontWeight: 600,
    fontSize: 12,
    margin: theme.spacing(0.4, 0),
  },
  hiddenText: {
    visibility: "hidden"
  },
  focused: {
    borderColor: theme?.palette?.action?.selected,
  },
  multiline: {
    padding: '12px',
    minHeight: 60,
    alignItems: "flex-start",
  },
  inline: {
    // display: "flex",
    // justifyContent: "space-between",
  },
  focusAdornment: {
    color: theme.palette.action?.selected
  },
  wordLimit: {
    float: "right",
    color: theme.palette.type === "dark" ? "#DEFFFF99" : "#00334099",
    fontFamily: 'Avenir Next',
    fontWeight: 700,
    fontSize: 10,
  },
}));



export default ArkInput;
